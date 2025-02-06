function stringifyError(err) {
    if (!(err instanceof Error)) {
        console.warn("Warning: Non-Error object passed to stringifyError:", err);
        return JSON.stringify({ error: "Invalid error object received" }, null, 2);
    }

    const errorObject = {
        name: err.name || "UnknownError",
        message: err.message || "No message provided",
        stack: err.stack || "No stack trace available",
        timestamp: new Date().toISOString(),
    };

    // Capture additional error properties dynamically
    Object.getOwnPropertyNames(err).forEach((prop) => {
        if (!["name", "message", "stack"].includes(prop)) {
            errorObject[prop] = err[prop];
        }
    });

    try {
        return JSON.stringify(errorObject, null, 2);
    } catch (serializationError) {
        return JSON.stringify({
            name: "SerializationError",
            message: "Error serializing original error object",
            originalError: errorObject,
        }, null, 2);
    }
}

module.exports = {
    stringifyError,
};
