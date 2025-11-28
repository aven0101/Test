const UAParser = require("ua-parser-js");
const requestIp = require("request-ip");
const geoip = require("geoip-lite");

/**
 * Extract device information from request
 * @param {Object} req - Express request object
 * @returns {Object} - Device information
 */
const extractDeviceInfo = (req) => {
	// Get user agent
	const userAgentString = req.headers["user-agent"] || "Unknown";

	const parser = new UAParser(userAgentString);
	const result = parser.getResult();

	// Get IP address
	const ipAddress = requestIp.getClientIp(req) || "";

	// Clean IPv6 localhost to IPv4
	const cleanIp = ipAddress.replace("::ffff:", "").replace("::1", "127.0.0.1");

	// Get geo location from IP
	let country = null;
	let city = null;
	let latitude = null;
	let longitude = null;

	// Don't try to geolocate localhost IPs
	if (cleanIp && cleanIp !== "127.0.0.1" && !cleanIp.startsWith("192.168.")) {
		const geo = geoip.lookup(cleanIp);
		if (geo) {
			country = geo.country || null;
			city = geo.city || null;
			if (geo.ll && geo.ll.length === 2) {
				latitude = geo.ll[0];
				longitude = geo.ll[1];
			}
		}
	}

	// Check if it's an API client (Postman, Insomnia, etc.)
	let browser = result.browser.name || "Unknown Browser";
	let browserVersion = result.browser.version || "Unknown";
	let os = result.os.name || "Unknown OS";
	let osVersion = result.os.version || "Unknown";
	let deviceType = "Desktop";

	// Special handling for API clients
	if (userAgentString.toLowerCase().includes("postman")) {
		browser = "Postman";
		browserVersion = "API Client";
		// Try to extract OS from user agent
		if (userAgentString.includes("Windows")) {
			os = "Windows";
		} else if (userAgentString.includes("Mac")) {
			os = "Mac OS";
		} else if (userAgentString.includes("Linux")) {
			os = "Linux";
		}
		deviceType = "API Client";
	} else if (userAgentString.toLowerCase().includes("insomnia")) {
		browser = "Insomnia";
		browserVersion = "API Client";
		deviceType = "API Client";
	} else if (userAgentString.toLowerCase().includes("curl")) {
		browser = "cURL";
		browserVersion = "Command Line";
		deviceType = "CLI";
	} else {
		// Use parsed values
		if (result.device.type) {
			// mobile, tablet, smarttv, wearable, embedded
			deviceType = result.device.type.charAt(0).toUpperCase() + result.device.type.slice(1);
		} else if (result.device.model) {
			deviceType = result.device.model;
		}
	}

	// Create device name
	let deviceName;
	if (result.device.vendor && result.device.model) {
		deviceName = `${result.device.vendor} ${result.device.model}`;
	} else if (browser !== "Unknown Browser") {
		deviceName = `${browser} on ${os}`;
	} else {
		deviceName = `${os} ${deviceType}`;
	}

	return {
		deviceName,
		deviceType,
		browser,
		browserVersion,
		os,
		osVersion,
		ipAddress: cleanIp,
		country,
		city,
		latitude,
		longitude,
		userAgent: userAgentString,
	};
};

/**
 * Get a friendly device description
 * @param {Object} sessionData - Session data
 * @returns {string} - Friendly description
 */
const getDeviceDescription = (sessionData) => {
	const parts = [];

	if (sessionData.browser) {
		parts.push(sessionData.browser);
		if (sessionData.browser_version) {
			parts.push(`${sessionData.browser_version}`);
		}
	}

	if (sessionData.os) {
		parts.push(`on ${sessionData.os}`);
		if (sessionData.os_version) {
			parts.push(sessionData.os_version);
		}
	}

	if (sessionData.city && sessionData.country) {
		parts.push(`from ${sessionData.city}, ${sessionData.country}`);
	} else if (sessionData.country) {
		parts.push(`from ${sessionData.country}`);
	}

	return parts.join(" ");
};

/**
 * Check if current request matches a session
 * @param {Object} req - Express request object
 * @param {Object} sessionData - Session data from database
 * @returns {boolean} - True if matches
 */
const isCurrentDevice = (req, sessionData) => {
	const currentDevice = extractDeviceInfo(req);

	return currentDevice.ipAddress === sessionData.ip_address && currentDevice.browser === sessionData.browser && currentDevice.os === sessionData.os;
};

module.exports = {
	extractDeviceInfo,
	getDeviceDescription,
	isCurrentDevice,
};
