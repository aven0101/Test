const { executeQuery } = require("../config/database");

const insertOtp = async ({ email, otp }) => {
	await executeQuery(
		`
      INSERT INTO otp (email, otp)
      VALUES (?, ?);`,
		[email, otp],
	);
};

const verifyToken = async ({ email, otp }) => {
	const res = await executeQuery(
		`
      SELECT *
      FROM otp
      WHERE otp = ?
        AND email = ?
        AND expires_at > CURRENT_TIMESTAMP
        AND is_used = false;
    `,
		[otp, email],
	);

	const isValid = res.length > 0;
	return isValid;
};

const updatePassword = async ({ email, password }) => {
	return await executeQuery(`UPDATE user SET password = ? WHERE email = ?;`, [password, email]);
};

const updatePasswordById = async ({ id, password }) => {
	return await executeQuery(`UPDATE user SET password = ? WHERE id = ?;`, [password, id]);
};

const updateOtpStatus = async ({ email }) => {
	await executeQuery(`UPDATE otp SET is_used = true WHERE email = ?;`, [email]);
};

module.exports = {
	insertOtp,
	verifyToken,
	updatePassword,
	updateOtpStatus,
	updatePasswordById,
};
