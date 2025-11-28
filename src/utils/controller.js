const assert = require("assert");
const config = require("../config");
const logger = require("../config/logger");
const { ZodError } = require("zod");

/**
 * Extract field details from Zod validation errors
 * @param {ZodError} error - Zod validation error
 * @returns {Array<{name: string, error: string}>} - Array of field objects with name and error message
 */
const extractZodErrorFields = (error) => {
	if (error instanceof ZodError && error.errors.length > 0) {
		// Map each error to an object with name and error message
		return error.errors
			.filter((err) => err.path.length > 0)
			.map((err) => ({
				name: err.path.join("."),
				error: err.message
			}));
	}
	return [];
};

const controller = (schema, service) => {
	return async (req, res) => {
		try {
			const user = { id: req.user_id, role: req.role, business_id: req.business_id };

			let body, query, params;

			try {
				body = schema?.body ? schema.body.parse(req.body) : req.body;
				query = schema?.query ? schema.query.parse(req.query) : req.query;
				params = schema?.params ? schema.params.parse(req.params) : req.params;
			} catch (error) {
				if (config.test) {
					// Helpful for debugging 400 errors in tests
					console.error(error);
				}

				// Extract field names if it's a Zod validation error
				const fields = extractZodErrorFields(error);
				return Response.error("Validation error", 400, fields).send(res);
			}

			const response = await service({ body, query, params }, user, req);

			assert(response instanceof Response, "The result of a `service` must be an instance of `Response`");

			if (response.error) {
				logger.error(`${req.method} ${req.path}`, {
					statusCode: response.code,
					error: response.body,
					user: user.id,
					ip: req.ip,
					userAgent: req.get("User-Agent"),
				});
			} else {
				logger.info(`${req.method} ${req.path}`, {
					statusCode: response.code,
					user: user.id,
					ip: req.ip,
					responseTime: Date.now() - req.startTime,
				});
			}

			response.send(res);
		} catch (err) {
			logger.error(`Unhandled error in ${req.method} ${req.path}`, {
				error: err.message,
				stack: err.stack,
				user: req.user_id || null,
				ip: req.ip,
				userAgent: req.get("User-Agent"),
			});
			Response.error(err.message ?? "Something went wrong", 500).send(res);
		}
	};
};

class Response {
	constructor(code, body) {
		this.code = code;
		this.body = body;
	}

	static error(message, code = 400, fields = null) {
		assert(typeof message === "string", "`message` must be a string");

		const responseBody = {
			success: false,
			error: message,
			message,
		};

		// Add fields array if provided
		if (fields && Array.isArray(fields) && fields.length > 0) {
			responseBody.fields = fields;
		}

		return new Response(code, responseBody);
	}

	static invalidReq() {
		return Response.error("Invalid request", 400);
	}

	static unauthorized() {
		return Response.error("Unauthorized", 401);
	}

	static notFound() {
		return Response.error("Not found", 404);
	}

	static notImplemented() {
		return Response.error("Not implemented", 501);
	}

	static permissionDenied() {
		return Response.error("You do not have permission to perform this action.", 403);
	}

	static ok(body) {
		return new Response(200, {
			...body,
			success: true,
		});
	}

	static okMessage(message) {
		assert(typeof message === "string", "`message` must be a string");

		return new Response(200, {
			success: true,
			message,
		});
	}

	send(res) {
		res.status(this.code);

		if (this.body) {
			res.json(this.body);
		}
	}

	get error() {
		return this.code < 200 || this.code >= 300;
	}
}

module.exports = {
	controller,
	Response,
};
