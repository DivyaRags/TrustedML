"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose = require("mongoose");
exports.registrySchema = mongoose.model('RegistryRepo', {
    address: String,
    solidityCode: String,
    abi: String,
    bytecode: String,
});
//# sourceMappingURL=procModelData.js.map