const { AppError } = require('./errorHandler');
const { ZodError } = require('zod');

/**
 * Extract field details from Zod validation errors
 * @param {ZodError} zodError - Zod validation error
 * @returns {Array<{name: string, error: string}>} - Array of field objects with name and error message
 */
const extractZodErrorFields = (zodError) => {
	if (zodError instanceof ZodError && zodError.errors.length > 0) {
		// Map each error to an object with name and error message
		return zodError.errors
			.filter((err) => err.path.length > 0)
			.map((err) => ({
				name: err.path.join("."),
				error: err.message
			}));
	}
	return [];
};

const validate = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      const fields = extractZodErrorFields(result.error);
      const error = new AppError("Validation error", 400);
      error.fields = fields;
      return next(error);
    }
    
    // Replace req.body with validated and transformed data
    req.body = result.data;
    next();
  };
};

const validateParams = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);
    
    if (!result.success) {
      const fields = extractZodErrorFields(result.error);
      const error = new AppError("Validation error", 400);
      error.fields = fields;
      return next(error);
    }
    
    // Replace req.params with validated and transformed data
    req.params = result.data;
    next();
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    
    if (!result.success) {
      const fields = extractZodErrorFields(result.error);
      const error = new AppError("Validation error", 400);
      error.fields = fields;
      return next(error);
    }
    
    // Replace req.query with validated and transformed data
    req.query = result.data;
    next();
  };
};

module.exports = {
  validate,
  validateParams,
  validateQuery,
};
