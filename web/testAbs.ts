import { getLabDefinition } from './src/lib/labDictionary';

const tests = [
  'Neutrophils Absolute',
  'Lymphocytes Absolute',
  'Monocytes Absolute',
  'Eosinophils Absolute',
  'Basophils Absolute'
];

for (const t of tests) {
  const def = getLabDefinition(t);
  console.log(`Test: ${t.padEnd(25)} -> ${def ? def.title : 'NULL'}`);
}
