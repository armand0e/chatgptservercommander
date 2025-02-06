// Swagger/OpenAPI Documentation Setup
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.1.0', // OpenAPI spec version
        info: {
            title: 'Terminal for ChatGPT', // Title of your API
            version: '1.0.0', // Version of your API
            description: 'API to execute terminal commands, manage files, and interact with a shell from ChatGPT.',
        },
        components: {
            schemas: {},
        },
    },
    apis: ['./api/*.js'], // Path to your endpoint definitions
};

const openapiSpecification = swaggerJsdoc(options);

module.exports = {
    setURL: (url) => {
        if (!url || typeof url !== 'string') {
            console.warn('Invalid URL provided for Swagger setup.');
            return;
        }

        openapiSpecification.servers = [{ url }];
        console.log(`Swagger API base URL set to: ${url}`);
    },

    openapiSpecification: (expressApp) => {
        expressApp.get('/openapi.json', (req, res) => {
            res.setHeader('Content-Type', 'application/json');
            res.status(200).json(openapiSpecification);
        });
    }
};
