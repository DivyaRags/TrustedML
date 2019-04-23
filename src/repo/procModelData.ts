import * as mongoose from 'mongoose';

export let registrySchema = mongoose.model('RegistryRepo', {
  address: String,
  solidityCode: String,
  abi: String,
  bytecode: String,
});