const express = require("express"),
	router = express.Router({ strict: true });

router.use("/api/v1/auth", require("./auth"));
router.use("/api/v1/users", require("./users"));
router.use("/api/v1/business/users", require("./businessUsers"));
router.use("/api/v1/device-sessions", require("./deviceSessions"));
router.use("/api/v1/2fa", require("./twoFactor"));
router.use("/api/v1/billing", require("./billing"));
router.use("/api/v1/profile", require("./profile"));
router.use("/api/v1/address", require("./address"));

module.exports = router;
