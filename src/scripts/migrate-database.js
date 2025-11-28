/**
 * Database Migration Script
 *
 * This script initializes or updates the MySQL database schema
 * Run: node src/scripts/migrate-database.js
 */

const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const config = {
	host: process.env.DB_HOST || "localhost",
	port: process.env.DB_PORT || 3306,
	user: process.env.DB_USER || "root",
	password: process.env.DB_PASSWORD || "",
	database: process.env.DB_NAME || "psfss",
	multipleStatements: true,
};

async function runMigration() {
	let connection;

	try {
		console.log("🔄 Connecting to MySQL server...");
		console.log(`   Host: ${config.host}:${config.port}`);
		console.log(`   User: ${config.user}`);
		console.log(`   Database: ${config.database}`);

		// Connect to MySQL server (without specifying database)
		connection = await mysql.createConnection({
			host: config.host,
			port: config.port,
			user: config.user,
			password: config.password,
			multipleStatements: true,
		});

		console.log("✅ Connected to MySQL server");

		// Read SQL file
		const sqlFilePath = path.join(__dirname, "init-database.sql");
		console.log(`📖 Reading SQL file: ${sqlFilePath}`);

		const sql = fs.readFileSync(sqlFilePath, "utf8");

		console.log("🚀 Executing migration...");
		await connection.query(sql);

		console.log("✅ Database migration completed successfully!");
		console.log(`   Database '${config.database}' is ready`);

		// Verify tables
		await connection.query(`USE ${config.database}`);
		const [tables] = await connection.query("SHOW TABLES");

		console.log("\n📋 Created tables:");
		tables.forEach((table, index) => {
			console.log(`   ${index + 1}. ${Object.values(table)[0]}`);
		});

		// Show user role enum values
		const [roleInfo] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = '${config.database}' 
      AND TABLE_NAME = 'user' 
      AND COLUMN_NAME = 'role'
    `);

		if (roleInfo.length > 0) {
			console.log(`\n👥 User roles configured: ${roleInfo[0].COLUMN_TYPE}`);
		}
	} catch (error) {
		console.error("❌ Migration failed:", error.message);

		if (error.code === "ER_ACCESS_DENIED_ERROR") {
			console.error("\n💡 Solution: Check your database credentials in .env file");
			console.error("   DB_USER and DB_PASSWORD must be correct");
		} else if (error.code === "ECONNREFUSED") {
			console.error("\n💡 Solution: Make sure MySQL server is running");
			console.error(`   Try: mysql.server start (macOS) or sudo service mysql start (Linux)`);
		}

		process.exit(1);
	} finally {
		if (connection) {
			await connection.end();
			console.log("\n🔌 Connection closed");
		}
	}
}

// Run migration
console.log("╔══════════════════════════════════════════╗");
console.log("║   PSFSS Database Migration Script       ║");
console.log("╚══════════════════════════════════════════╝\n");

runMigration();
