const mysql = require("mysql2");
const config = require(".");
const logger = require("./logger");

const pool = mysql.createPool({
	connectionLimit: config.db?.connectionLimit || 10,
	host: config.DB_HOST,
	user: config.DB_USER,
	password: config.DB_PASSWORD,
	database: config.DB_NAME,
	port: config.DB_PORT,
	charset: "utf8mb4",
	timezone: "Z",
	dateStrings: false,
	multipleStatements: false,
});

const executeQuery = async (query, data) => {
	const startTime = Date.now();
	return new Promise((resolve, reject) => {
		pool.query(query, data, function (error, results) {
			const queryTime = Date.now() - startTime;

			if (error) {
				logger.error("Database query failed", {
					query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
					error: error.message,
					queryTime,
				});
				reject(error);
			} else {
				logger.debug("Database query executed", {
					query: query.substring(0, 100) + (query.length > 100 ? "..." : ""),
					resultCount: Array.isArray(results) ? results.length : 1,
					queryTime,
				});
				resolve(results);
			}
		});
	});
};

const executeTransactionQuery = async (connection, query, data) => {
	return new Promise((resolve, reject) => {
		connection.query(query, data, function (error, results) {
			if (error) {
				reject(error);
			} else {
				resolve(results);
			}
		});
	});
};

const runTransaction = (transaction) => {
	return new Promise((resolve, reject) => {
		pool.getConnection(async (err, connection) => {
			if (err) {
				reject(err);
			}

			connection.beginTransaction(async (err) => {
				if (err) {
					reject(err);
				}

				try {
					const res = await transaction(connection);
					connection.commit(() => {
						connection.release();
						resolve(res);
					});
				} catch (error) {
					connection.rollback(() => {
						connection.release();
						reject(error);
					});
				}
			});
		});
	});
};

// Test database connection
pool.getConnection((err, connection) => {
	if (err) {
		logger.error("Database connection failed", {
			error: err.message,
			host: config.DB_HOST || config.db?.host || "localhost",
			port: config.DB_PORT || config.db?.port || 3306,
			database: config.DB_NAME || config.db?.name || "psfss",
		});
	} else {
		logger.info("Database connected successfully", {
			host: config.DB_HOST || config.db?.host || "localhost",
			port: config.DB_PORT || config.db?.port || 3306,
			database: config.DB_NAME || config.db?.name || "psfss",
		});
		connection.release();
	}
});

module.exports = {
	executeQuery,
	pool,
	executeTransactionQuery,
	runTransaction,
};
