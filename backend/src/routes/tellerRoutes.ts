import express from 'express';
import prisma from '../prismaClient';

const router = express.Router();

// Helper to get system state
async function getSystemState() {
  let state = await prisma.systemState.findUnique({ where: { id: 1 } });
  if (!state) {
    state = await prisma.systemState.create({
      data: { id: 1, totalSupply: 100000000, reserve: 100000000, circulating: 0, feeAccumulated: 0 }
    });
  }
  return state;
}

// 1. GET /api/teller/users/:id - Search Nasabah
router.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'Nasabah tidak ditemukan' });
    }
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 2. POST /api/teller/deposit - Setor Tunai
router.post('/deposit', async (req, res) => {
  const { userId, amount } = req.body;
  const depositAmount = Number(amount);

  if (!userId || !depositAmount || depositAmount <= 0) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const state = await tx.systemState.findUnique({ where: { id: 1 } });
      if (!state) throw new Error('System state not found');

      if (state.reserve < depositAmount) {
        throw new Error('Bank Reserve tidak mencukupi untuk mencetak uang digital baru.');
      }

      // Validasi Keras: Reserve >= 98% Total Supply
      const minReserve = state.totalSupply * 0.98;
      if (state.reserve - depositAmount < minReserve) {
        throw new Error('Validasi Keras Gagal: Setoran ini akan membuat Reserve jatuh di bawah 98% dari Total Supply. Transaksi ditolak.');
      }

      // Kurangi reserve, tambah circulating
      const updatedState = await tx.systemState.update({
        where: { id: 1 },
        data: {
          reserve: { decrement: depositAmount },
          circulating: { increment: depositAmount }
        }
      });

      // Tambah saldo user
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: depositAmount } }
      });

      // Catat transaksi
      const transaction = await tx.transaction.create({
        data: {
          id: 'TRX-' + Date.now() + Math.floor(Math.random() * 1000),
          title: 'Setor Tunai',
          subtitle: `Deposit oleh ${updatedUser.name}`,
          type: 'in',
          amount: depositAmount,
          source: 'Teller Pusat',
          status: 'success'
        }
      });

      return { state: updatedState, user: updatedUser, transaction };
    });

    res.json({ message: 'Setor Tunai berhasil', data: result });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

// 3. POST /api/teller/withdraw - Tarik Tunai
router.post('/withdraw', async (req, res) => {
  const { userId, amount } = req.body;
  const withdrawAmount = Number(amount);

  if (!userId || !withdrawAmount || withdrawAmount <= 0) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('Nasabah tidak ditemukan');

      if (user.balance < withdrawAmount) {
        throw new Error('Saldo nasabah tidak mencukupi');
      }

      const state = await tx.systemState.findUnique({ where: { id: 1 } });
      if (!state) throw new Error('System state not found');

      // Kurangi circulating, tambah reserve
      const updatedState = await tx.systemState.update({
        where: { id: 1 },
        data: {
          reserve: { increment: withdrawAmount },
          circulating: { decrement: withdrawAmount }
        }
      });

      // Kurangi saldo user
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: withdrawAmount } }
      });

      // Catat transaksi
      const transaction = await tx.transaction.create({
        data: {
          id: 'TRX-' + Date.now() + Math.floor(Math.random() * 1000),
          title: 'Tarik Tunai',
          subtitle: `Penarikan oleh ${updatedUser.name}`,
          type: 'out',
          amount: withdrawAmount,
          source: 'Teller Pusat',
          status: 'success'
        }
      });

      return { state: updatedState, user: updatedUser, transaction };
    });

    res.json({ message: 'Tarik Tunai berhasil', data: result });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

// 4. POST /api/teller/transfer - Transfer Dana
router.post('/transfer', async (req, res) => {
  const { senderId, receiverId, amount } = req.body;
  const transferAmount = Number(amount);

  if (!senderId || !receiverId || !transferAmount || transferAmount <= 0) {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const sender = await tx.user.findUnique({ where: { id: senderId } });
      if (!sender) throw new Error('Pengirim tidak ditemukan');

      const receiver = await tx.user.findUnique({ where: { id: receiverId } });
      if (!receiver) throw new Error('Penerima tidak ditemukan');

      if (sender.balance < transferAmount) {
        throw new Error('Saldo pengirim tidak mencukupi');
      }

      // Kurangi saldo pengirim
      await tx.user.update({
        where: { id: senderId },
        data: { balance: { decrement: transferAmount } }
      });

      // Tambah saldo penerima
      await tx.user.update({
        where: { id: receiverId },
        data: { balance: { increment: transferAmount } }
      });

      // Catat transaksi (dari sudut pandang sistem/pengirim)
      const transaction = await tx.transaction.create({
        data: {
          id: 'TRX-' + Date.now() + Math.floor(Math.random() * 1000),
          title: 'Transfer Dana (Teller)',
          subtitle: `Dari ${sender.name} ke ${receiver.name}`,
          type: 'out',
          amount: transferAmount,
          source: 'Teller Pusat',
          status: 'success'
        }
      });

      return { transaction };
    });

    res.json({ message: 'Transfer berhasil', data: result });
  } catch (error: any) {
    console.error(error);
    res.status(400).json({ error: error.message });
  }
});

// 5. GET /api/teller/transactions - Get Teller History
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { source: 'Teller Pusat' },
      orderBy: { createdAt: 'desc' }
    });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 6. GET /api/teller/dashboard - Get Teller Stats & Queue
router.get('/dashboard', async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { source: 'Teller Pusat' },
      orderBy: { createdAt: 'desc' }
    });

    const shiftCount = transactions.length;
    const totalIn = transactions.filter((t: any) => t.type === 'in').reduce((sum: number, t: any) => sum + t.amount, 0);
    const totalOut = transactions.filter((t: any) => t.type === 'out').reduce((sum: number, t: any) => sum + t.amount, 0);
    
    // Antrean / Transaksi Terakhir
    const recentQueue = transactions.slice(0, 10);

    res.json({
      stats: {
        totalTransactions: shiftCount,
        totalIn: totalIn,
        totalOut: totalOut
      },
      recentQueue
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
