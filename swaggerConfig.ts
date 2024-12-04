const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "API Documentation",
            version: "1.0.0",
        },
    },
    apis: ["./auth/*.ts", "./controllers/*.ts"] // files, where Swagger-comments exits
};

const specs = swaggerJsdoc(options);

exports = { swaggerUi, specs };
