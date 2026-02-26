import { Router, Request, Response } from 'express';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { optionalApiKey } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rateLimit';

const router = Router();

// Mock data for demonstration purposes
// In production, this would integrate with the actual LightFM Python library
const mockDatasets: Record<string, {
  users: number;
  items: number;
  interactions: number;
  density: string;
  itemLabels: string[];
}> = {
  movielens: {
    users: 943,
    items: 1682,
    interactions: 100000,
    density: '6.30%',
    itemLabels: [
      'Toy Story (1995)', 'GoldenEye (1995)', 'Four Rooms (1995)', 'Get Shorty (1995)',
      'Copycat (1995)', 'Shanghai Triad (1995)', 'Twelve Monkeys (1995)', 'Babe (1995)',
      'Dead Man Walking (1995)', 'Richard III (1995)', 'Seven (1995)', 'Usual Suspects (1995)',
      'Mighty Aphrodite (1995)', 'Postino, Il (1994)', 'Mr. Holland\'s Opus (1995)',
      'French Twist (1995)', 'From Dusk Till Dawn (1996)', 'White Balloon, The (1995)',
      'Antonia\'s Line (1995)', 'Angels and Insects (1995)', 'Muppet Treasure Island (1996)',
      'Braveheart (1995)', 'Taxi Driver (1976)', 'Rumble in the Bronx (1995)',
      'Birdcage, The (1996)', 'Brothers McMullen, The (1995)', 'Bad Boys (1995)',
      'Apollo 13 (1995)', 'Batman Forever (1995)', 'Belle de jour (1967)',
    ],
  },
  movielens_1m: {
    users: 6040,
    items: 3706,
    interactions: 1000209,
    density: '4.47%',
    itemLabels: [
      'Toy Story (1995)', 'Jumanji (1995)', 'Grumpier Old Men (1995)', 'Waiting to Exhale (1995)',
      'Father of the Bride Part II (1995)', 'Heat (1995)', 'Sabrina (1995)', 'Tom and Huck (1995)',
      'Sudden Death (1995)', 'GoldenEye (1995)', 'American President, The (1995)', 'Dracula: Dead and Loving It (1995)',
      'Balto (1995)', 'Nixon (1995)', 'Cutthroat Island (1995)', 'Casino (1995)',
      'Sense and Sensibility (1995)', 'Four Rooms (1995)', 'Ace Ventura: When Nature Calls (1995)', 'Money Train (1995)',
      'Get Shorty (1995)', 'Copycat (1995)', 'Assassins (1995)', 'Powder (1995)',
    ],
  },
  stackexchange: {
    users: 15000,
    items: 5000,
    interactions: 250000,
    density: '0.33%',
    itemLabels: [
      'Question 1: Python list comprehension',
      'Question 2: JavaScript async/await',
      'Question 3: SQL JOIN operations',
      'Question 4: React useEffect hook',
      'Question 5: Docker containerization',
      'Question 6: Git merge vs rebase',
      'Question 7: CSS Grid layout',
      'Question 8: Machine learning basics',
      'Question 9: REST API design',
      'Question 10: Kubernetes pods',
    ],
  },
  custom: {
    users: 1000,
    items: 500,
    interactions: 50000,
    density: '10.00%',
    itemLabels: [
      'Custom Item 1', 'Custom Item 2', 'Custom Item 3', 'Custom Item 4',
      'Custom Item 5', 'Custom Item 6', 'Custom Item 7', 'Custom Item 8',
      'Custom Item 9', 'Custom Item 10',
    ],
  },
};

// Store for trained models (in-memory, per session)
const trainedModels: Map<string, {
  metrics: {
    precision: number;
    auc: number;
    recall: number;
    epochs: number;
    loss: string;
    components: number;
  };
  itemEmbeddings: number[][];
  userEmbeddings: number[][];
}> = new Map();

/**
 * GET /api/v1/lightfm/dataset/:name
 * Get dataset information
 */
router.get('/dataset/:name', optionalApiKey, apiRateLimiter, requireAnyAuth, (req: Request, res: Response) => {
  const name = req.params['name'] as string;
  const dataset = mockDatasets[name];

  if (!dataset) {
    return res.status(404).json({
      error: 'Dataset not found',
      available: Object.keys(mockDatasets),
    });
  }

  res.json({
    name,
    users: dataset.users,
    items: dataset.items,
    interactions: dataset.interactions,
    density: dataset.density,
  });
});

/**
 * POST /api/v1/lightfm/train
 * Train a LightFM model
 */
router.post('/train', optionalApiKey, apiRateLimiter, requireAnyAuth, async (req: Request, res: Response) => {
  try {
    const { dataset, epochs = 30, components = 30, loss = 'warp' } = req.body;
    const userId = (req as any).user?.id || 'anonymous';

    // Validate dataset
    if (!mockDatasets[dataset]) {
      return res.status(400).json({
        error: 'Invalid dataset',
        available: Object.keys(mockDatasets),
      });
    }

    // Simulate training time
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate realistic mock metrics based on parameters
    const basePrecision = 0.05 + (epochs / 100) * 0.1 + (components / 100) * 0.05;
    const baseAuc = 0.85 + (epochs / 100) * 0.05 + (components / 200) * 0.03;
    const baseRecall = 0.03 + (epochs / 100) * 0.08 + (components / 100) * 0.04;

    // Loss function adjustments
    const lossMultipliers: Record<string, { p: number; a: number; r: number }> = {
      warp: { p: 1.0, a: 1.0, r: 1.0 },
      bpr: { p: 0.9, a: 0.95, r: 0.95 },
      logistic: { p: 0.8, a: 0.9, r: 0.85 },
    };

    const multiplier = lossMultipliers[loss] || lossMultipliers.warp;

    const metrics = {
      precision: Math.min(0.25, basePrecision * multiplier.p + Math.random() * 0.02),
      auc: Math.min(0.98, baseAuc * multiplier.a + Math.random() * 0.01),
      recall: Math.min(0.20, baseRecall * multiplier.r + Math.random() * 0.02),
      epochs,
      loss,
      components,
    };

    // Store the trained model
    const ds = mockDatasets[dataset];
    const modelKey = `${userId}_${dataset}`;

    // Generate random embeddings
    const itemEmbeddings = Array(ds.items).fill(0).map(() =>
      Array(components).fill(0).map(() => Math.random() * 2 - 1)
    );
    const userEmbeddings = Array(ds.users).fill(0).map(() =>
      Array(components).fill(0).map(() => Math.random() * 2 - 1)
    );

    trainedModels.set(modelKey, {
      metrics,
      itemEmbeddings,
      userEmbeddings,
    });

    res.json({
      success: true,
      dataset,
      metrics,
      message: `Model trained successfully with ${loss.toUpperCase()} loss`,
    });
  } catch (error) {
    console.error('LightFM training error:', error);
    res.status(500).json({
      error: 'Training failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/lightfm/recommend
 * Get recommendations for a user
 */
router.post('/recommend', optionalApiKey, apiRateLimiter, requireAnyAuth, (req: Request, res: Response) => {
  try {
    const { userId, numRecommendations = 10 } = req.body;
    const requestingUserId = (req as any).user?.id || 'anonymous';

    // Find the most recent trained model for this user
    let modelKey: string | null = null;
    for (const [key] of trainedModels) {
      if (key.startsWith(`${requestingUserId}_`)) {
        modelKey = key;
        break;
      }
    }

    if (!modelKey) {
      return res.status(400).json({
        error: 'No trained model found',
        message: 'Please train a model first',
      });
    }

    const model = trainedModels.get(modelKey)!;
    const datasetName = modelKey.split('_')[1];
    const dataset = mockDatasets[datasetName];

    // Get user embedding (with bounds check)
    const userIdx = Math.min(userId - 1, model.userEmbeddings.length - 1);
    const userEmbedding = model.userEmbeddings[userIdx];

    // Calculate scores for all items
    const scores = model.itemEmbeddings.map((itemEmb, idx) => {
      // Dot product
      const score = userEmbedding.reduce((sum, val, i) => sum + val * itemEmb[i], 0);
      return { itemId: idx, score, label: dataset.itemLabels[idx % dataset.itemLabels.length] };
    });

    // Sort by score and get top N
    const recommendations = scores
      .sort((a, b) => b.score - a.score)
      .slice(0, numRecommendations);

    res.json({
      success: true,
      userId,
      numRecommendations,
      recommendations,
    });
  } catch (error) {
    console.error('LightFM recommendation error:', error);
    res.status(500).json({
      error: 'Recommendation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/lightfm/status
 * Get system status
 */
router.get('/status', optionalApiKey, apiRateLimiter, requireAnyAuth, (_req: Request, res: Response) => {
  res.json({
    status: 'operational',
    version: '1.17',
    features: ['WARP', 'BPR', 'Logistic', 'Item features', 'User features'],
    datasets: Object.keys(mockDatasets),
    activeModels: trainedModels.size,
  });
});

export default router;
