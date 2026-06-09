import { Router } from 'express';
import prisma from '../prismaClient';

const router = Router();

// --- Bank Graph for AML Tracking (BFS) ---
class BankGraph {
    private adjacencyList: Map<string, string[]>;

    constructor() {
        this.adjacencyList = new Map();
    }

    addTransaction(fromAccount: string, toAccount: string) {
        if (!this.adjacencyList.has(fromAccount)) {
            this.adjacencyList.set(fromAccount, []);
        }
        if (!this.adjacencyList.has(toAccount)) {
            this.adjacencyList.set(toAccount, []);
        }
        this.adjacencyList.get(fromAccount)?.push(toAccount);
    }

    trackMoneyLaunderingBFS(startAccount: string, depthLimit: number) {
        let visited = new Set<string>();
        let queue: { account: string, depth: number }[] = [];

        queue.push({ account: startAccount, depth: 0 });
        visited.add(startAccount);

        const suspiciousNetwork = [];

        while (queue.length > 0) {
            let { account, depth } = queue.shift()!;
            suspiciousNetwork.push({ account, depth });

            if (depth < depthLimit) {
                let destinations = this.adjacencyList.get(account) || [];
                for (let dest of destinations) {
                    if (!visited.has(dest)) {
                        visited.add(dest);
                        queue.push({ account: dest, depth: depth + 1 });
                    }
                }
            }
        }
        return suspiciousNetwork;
    }
}
// ----------------------------------------

// Helper to get or create system state
async function getSystemState() {
  let state = await prisma.systemState.findUnique({ where: { id: 1 } });
  if (!state) {
    state = await prisma.systemState.create({
      data: {
        id: 1,
        totalSupply: 100000000,
        reserve: 100000000,
        circulating: 0,
        feeAccumulated: 0,
      }
    });
  }
  return state;
}

// Helper to generate IDs
function generateId(prefix: string) {
  return `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
}

router.get('/dashboard', async (req, res) => {
  try {
    const state = await getSystemState();
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ systemState: state, transactions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const state = await getSystemState();
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'asc' }
    });

    // Dummy aggregations for the chart to simulate time series
    // In a real app, this would group by day/week. For now, we chunk transactions.
    const moneyFlowLabels = ['Hari 1', 'Hari 2', 'Hari 3', 'Hari 4', 'Hari 5', 'Hari 6', 'Hari 7'];
    const moneyFlowData = [0, 0, 0, 0, 0, 0, 0];
    
    // Distribute transactions across the 7 days roughly based on index
    transactions.forEach((tx: any, index: number) => {
        const bucket = Math.floor((index / transactions.length) * 7);
        if (bucket >= 0 && bucket < 7) {
            moneyFlowData[bucket] += (tx.amount / 1000000); // Scale down to millions for chart readability
        }
    });

    const distributionData = [
      state.reserve,
      state.circulating,
      state.feeAccumulated
    ];

    res.json({
      moneyFlow: {
        labels: moneyFlowLabels,
        data: moneyFlowData
      },
      distribution: {
        data: distributionData
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/distribute', async (req, res) => {
  const { amount, targetEntity } = req.body;
  if (!amount || amount <= 0 || !targetEntity) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const state = await tx.systemState.findUnique({ where: { id: 1 } });
      if (!state || state.reserve < amount) {
        throw new Error('Insufficient reserve funds');
      }

      // Validasi Keras: Reserve >= 98% Total Supply
      const minReserve = state.totalSupply * 0.98;
      if (state.reserve - amount < minReserve) {
        throw new Error('Validasi Keras Gagal: Distribusi ini akan membuat Reserve jatuh di bawah 98% dari Total Supply');
      }

      const updatedState = await tx.systemState.update({
        where: { id: 1 },
        data: {
          reserve: { decrement: amount },
          circulating: { increment: amount }
        }
      });

      const transaction = await tx.transaction.create({
        data: {
          id: generateId('TRX'),
          title: 'Distribusi Dana',
          subtitle: `Ke: ${targetEntity}`,
          type: 'out',
          amount: amount,
          source: 'SmartBank'
        }
      });

      return { state: updatedState, transaction };
    });

    res.json({ message: 'Dana berhasil didistribusikan', data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/fee', async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const state = await tx.systemState.findUnique({ where: { id: 1 } });
      if (!state || state.circulating < amount) {
        throw new Error('Insufficient circulating funds for fee collection');
      }

      const updatedState = await tx.systemState.update({
        where: { id: 1 },
        data: {
          circulating: { decrement: amount },
          feeAccumulated: { increment: amount }
        }
      });

      const transaction = await tx.transaction.create({
        data: {
          id: generateId('TRX'),
          title: 'Tarik Fee Sistem',
          subtitle: 'Penarikan Fee Manual',
          type: 'fee',
          amount: amount,
          source: 'SmartBank'
        }
      });

      return { state: updatedState, transaction };
    });

    res.json({ message: 'Fee berhasil ditarik', data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/loans', async (req, res) => {
  try {
    const loans = await prisma.loan.findMany({
      include: { user: true },
      orderBy: { id: 'desc' }
    });
    res.json(loans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/loans/:id/validate', async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'approve' or 'reject'

  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ error: 'Invalid action' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({ where: { id }, include: { user: true } });
      if (!loan) throw new Error('Loan not found');
      if (loan.status !== 'pending') throw new Error('Loan is not pending');

      if (action === 'reject') {
        const updatedLoan = await tx.loan.update({
          where: { id },
          data: { status: 'rejected' }
        });
        return { message: 'Pinjaman ditolak', loan: updatedLoan };
      }

      // Approve logic
      const state = await tx.systemState.findUnique({ where: { id: 1 } });
      if (!state || state.reserve < loan.amount) {
        throw new Error('Insufficient reserve to approve loan');
      }

      // Validasi Keras: Reserve >= 98% Total Supply
      const minReserve = state.totalSupply * 0.98;
      if (state.reserve - loan.amount < minReserve) {
        throw new Error('Validasi Keras Gagal: Pencairan pinjaman ini akan membuat Reserve jatuh di bawah 98% dari Total Supply');
      }

      const updatedState = await tx.systemState.update({
        where: { id: 1 },
        data: {
          reserve: { decrement: loan.amount },
          circulating: { increment: loan.amount }
        }
      });

      const updatedLoan = await tx.loan.update({
        where: { id },
        data: { status: 'approved' }
      });

      await tx.user.update({
        where: { id: loan.userId },
        data: { balance: { increment: loan.amount } }
      });

      const transaction = await tx.transaction.create({
        data: {
          id: generateId('TRX'),
          title: 'Pencairan Pinjaman',
          subtitle: `Pencairan ke ${loan.user.name}`,
          type: 'out',
          amount: loan.amount,
          source: 'SmartBank'
        }
      });

      return { message: 'Pinjaman disetujui', loan: updatedLoan, transaction, state: updatedState };
    });

    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { id: 'asc' }
    });
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// AML Tracking Endpoint
router.get('/aml-tracking/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const transactions = await prisma.transaction.findMany();
    const graph = new BankGraph();
    
    transactions.forEach((tx: any) => {
      if (tx.title === 'Transfer Dana' && tx.subtitle) {
        const parts = tx.subtitle.replace('Dari ', '').split(' ke ');
        if (parts.length === 2) {
          graph.addTransaction(parts[0].trim(), parts[1].trim());
        }
      }
    });

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const network = graph.trackMoneyLaunderingBFS(user.name, 3); // Lacak hingga 3 layer/kedalaman
    res.json({ network });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Closing Report Endpoint (Divide & Conquer Parallel Simulation)
router.get('/closing-report', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany();
    
    // Divide (Pecah data jadi 4 chunk)
    const chunkSize = Math.ceil(transactions.length / 4) || 1;
    const chunks = [];
    for (let i = 0; i < transactions.length; i += chunkSize) {
      chunks.push(transactions.slice(i, i + chunkSize));
    }

    // Conquer (Proses secara non-blocking / simulasi paralel worker thread)
    const promises = chunks.map((chunk: any[]) => {
      return new Promise((resolve) => {
        setTimeout(() => {
            const sumOut = chunk.filter(t => t.type === 'out').reduce((acc, t) => acc + t.amount, 0);
            const sumIn = chunk.filter(t => t.type === 'in').reduce((acc, t) => acc + t.amount, 0);
            const sumFee = chunk.filter(t => t.type === 'fee').reduce((acc, t) => acc + t.amount, 0);
            resolve({ sumOut, sumIn, sumFee, count: chunk.length });
        }, 50); // delay untuk melepas thread sementara
      });
    });

    const results: any[] = await Promise.all(promises);

    // Combine (Agregasi akhir)
    const finalReport = results.reduce((acc, r) => {
      return {
        totalOut: acc.totalOut + r.sumOut,
        totalIn: acc.totalIn + r.sumIn,
        totalFee: acc.totalFee + r.sumFee,
        totalTransactions: acc.totalTransactions + r.count
      };
    }, { totalOut: 0, totalIn: 0, totalFee: 0, totalTransactions: 0 });

    res.json(finalReport);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
router.post('/settings/supply', async (req, res) => {
  const { newSupply } = req.body;
  if (!newSupply || newSupply <= 0) {
    return res.status(400).json({ error: 'Invalid supply value' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const state = await tx.systemState.findUnique({ where: { id: 1 } });
      if (!state) throw new Error('System state not found');

      const diff = Number(newSupply) - state.totalSupply;
      
      if (diff < 0) {
        // Decrease supply: validate 98% rule
        const proposedReserve = state.reserve + diff; // diff is negative
        const minReserve = Number(newSupply) * 0.98;
        if (proposedReserve < minReserve) {
          throw new Error('Validasi Keras Gagal: Tidak bisa menurunkan supply karena Reserve akan jatuh di bawah 98% dari Total Supply baru.');
        }
        if (proposedReserve < 0) {
           throw new Error('Reserve tidak mencukupi untuk pengurangan supply.');
        }
      }

      const updatedState = await tx.systemState.update({
        where: { id: 1 },
        data: {
          totalSupply: Number(newSupply),
          reserve: { increment: diff }
        }
      });
      return updatedState;
    });

    res.json({ message: 'Supply berhasil diupdate', data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
