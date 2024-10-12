module.exports = {
    networks: {
        development: {
            host: "127.0.0.1",
            port: 7545,
            network_id: "*" // Correspond à n'importe quel réseau
        }
    },
    compilers: {
        solc: {
            version: "0.8.0" // Assurez-vous que la version de Solidity correspond à celle du contrat
        }
    }
};

