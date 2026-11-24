import { RandomForestClassifier } from 'ml-random-forest';

const rf = new RandomForestClassifier({ nEstimators: 10, seed: 42 });
const X = [[1, 2], [1, 3], [10, 12], [11, 14]];
const y = [0, 0, 1, 1];
rf.train(X, y);
const preds = rf.predict([[1, 2.5], [10.5, 13]]);
console.log('RF predict:', preds);
console.log('rf toJSON exists:', typeof (rf as any).toJSON);
if ((rf as any).toJSON) {
  const json = (rf as any).toJSON();
  const loaded = RandomForestClassifier.load(json);
  console.log('loaded predict:', loaded.predict([[1, 2.5], [10.5, 13]]));
}
