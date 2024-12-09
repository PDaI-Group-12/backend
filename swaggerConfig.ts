
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "API Documentation",
            version: "1.0.0",
        },
        servers: [
            {
                url:"http://localhost:3000",
            },
        ],
    },
    apis: ["./controllers/auth/*.ts", "./controllers/salary/*.ts", "./controllers/user/*.ts"] // files, where Swagger-comments exits
};

const swaggerSpecs = swaggerJsdoc(options);

console.log("Swagger specs generated:", JSON.stringify(swaggerSpecs, null, 2));

export { swaggerUi, swaggerSpecs };
