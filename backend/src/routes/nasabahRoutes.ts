import { Router, Request, Response } from 'express';
import prisma from '../prismaClient';

const router = Router();

// Helper to generate IDs
function generateId(prefix: string) {
  return `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
}

// 1. POST /register - Registrasi Nasabah Baru
router.post('/register', async (req: Request, res: Response) => {
  const { id, name } = req.body;
  if (!id || !name) {
    return res.status(400).json({ error: 'ID User dan Nama wajib diisi' });
  }

  const userId = id.trim().toUpperCase();
  const userName = name.trim();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Check if user already exists
      const existingUser = await tx.user.findUnique({ where: { id: userId } });
      if (existingUser) {
        throw new Error('ID User sudah digunakan');
      }

      // Check if reserve is sufficient for starting balance (Rp 50.000)
      const startBalance = 50000;
      const state = await tx.systemState.findUnique({ where: { id: 1 } });
      if (!state || state.reserve < startBalance) {
        throw new Error('Sistem bank kehabisan dana cadangan (Reserve)');
      }

      // Create new user
      const user = await tx.user.create({
        data: {
          id: userId,
          name: userName,
          type: 'Nasabah',
          balance: startBalance,
          status: 'active',
        },
      });

      // Update system state
      await tx.systemState.update({
        where: { id: 1 },
        data: {
          reserve: { decrement: startBalance },
          circulating: { increment: startBalance },
        },
      });

      // Record transaction
      await tx.transaction.create({
        data: {
          id: generateId('TRX'),
          title: 'Saldo Awal Pendaftaran',
          subtitle: 'Registrasi Akun Baru',
          type: 'in',
          amount: startBalance,
          source: 'SmartBank',
          userId: userId,
        },
      });

      return user;
    });

    res.json({ message: 'Registrasi berhasil', user: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 2. POST /login - Login Nasabah
router.post('/login', async (req: Request, res: Response) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'ID User wajib diisi' });
  }

  const cleanId = userId.trim().toUpperCase();

  try {
    const user = await prisma.user.findUnique({ where: { id: cleanId } });
    if (!user) {
      return res.status(400).json({ error: 'User tidak ditemukan' });
    }

    if (user.status !== 'active') {
      return res.status(400).json({ error: 'Akun Anda sedang diblokir/dinonaktifkan' });
    }

    res.json({ message: 'Login berhasil', user });
  } catch (error: any) {
    res.status(500).json({ error: 'Gagal melakukan login' });
  }
});

// 3. GET /profile/:userId - Get Profile & Balance
router.get('/profile/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User tidak ditemukan' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data profil' });
  }
});

// 4. GET /transactions/:userId - Get User Transactions
router.get('/transactions/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data transaksi' });
  }
});

// 5. POST /transfer - Transfer Antar User
router.post('/transfer', async (req: Request, res: Response) => {
  const { senderId, receiverId, amount } = req.body;

  if (!senderId || !receiverId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Input transfer tidak valid' });
  }

  const cleanSenderId = senderId.trim().toUpperCase();
  const cleanReceiverId = receiverId.trim().toUpperCase();

  if (cleanSenderId === cleanReceiverId) {
    return res.status(400).json({ error: 'Tidak dapat mengirim ke rekening sendiri' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Validasi Pengirim & Penerima
      const sender = await tx.user.findUnique({ where: { id: cleanSenderId } });
      const receiver = await tx.user.findUnique({ where: { id: cleanReceiverId } });

      if (!sender || sender.status !== 'active') {
        throw new Error('Akun pengirim tidak aktif atau tidak ditemukan');
      }
      if (!receiver || receiver.status !== 'active') {
        throw new Error('Akun penerima tidak aktif atau tidak ditemukan');
      }

      // 2. Cooldown Transaksi (10 detik)
      const lastTx = await tx.transaction.findFirst({
        where: { userId: cleanSenderId, source: 'Nasabah App' },
        orderBy: { createdAt: 'desc' },
      });
      if (lastTx) {
        const timeDiff = (Date.now() - new Date(lastTx.createdAt).getTime()) / 1000;
        if (timeDiff < 10) {
          throw new Error(`Transaksi terlalu cepat! Cooldown aktif, mohon tunggu ${Math.ceil(10 - timeDiff)} detik lagi.`);
        }
      }

      // 3. Batas Maksimal Transaksi Harian (10 transaksi per hari)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dailyTxCount = await tx.transaction.count({
        where: {
          userId: cleanSenderId,
          createdAt: { gte: oneDayAgo },
        },
      });
      if (dailyTxCount >= 10) {
        throw new Error('Batas maksimal 10 transaksi harian tercapai untuk akun Anda.');
      }

      // 4. Kalkulasi Biaya Layanan Bank (1% dari nominal transfer)
      const fee = Math.floor(amount * 0.01);
      const totalDebit = amount + fee;

      if (sender.balance < totalDebit) {
        throw new Error(`Saldo tidak mencukupi. Dibutuhkan Rp ${totalDebit.toLocaleString('id-ID')} (termasuk biaya admin bank 1% sebesar Rp ${fee.toLocaleString('id-ID')})`);
      }

      // 5. Update Saldo
      await tx.user.update({
        where: { id: cleanSenderId },
        data: { balance: { decrement: totalDebit } },
      });

      await tx.user.update({
        where: { id: cleanReceiverId },
        data: { balance: { increment: amount } },
      });

      // 6. Update Macro Economy (Potongan Fee dipindahkan ke Reserve Bank)
      await tx.systemState.update({
        where: { id: 1 },
        data: {
          circulating: { decrement: fee },
          reserve: { increment: fee },
          // Opsional: kita juga bisa menambahkannya ke feeAccumulated
          feeAccumulated: { increment: fee },
        },
      });

      // 7. Catat Ledger Transaksi
      // Untuk Pengirim
      const txOut = await tx.transaction.create({
        data: {
          id: generateId('TRX'),
          title: `Transfer ke ${receiver.name}`,
          subtitle: `Ke: ${cleanReceiverId}`,
          type: 'out',
          amount: amount,
          source: 'Nasabah App',
          userId: cleanSenderId,
        },
      });

      // Biaya Admin Bank untuk Pengirim
      if (fee > 0) {
        await tx.transaction.create({
          data: {
            id: generateId('TRX'),
            title: 'Biaya Admin Transfer (1%)',
            subtitle: `Referensi: ${txOut.id}`,
            type: 'fee',
            amount: fee,
            source: 'SmartBank',
            userId: cleanSenderId,
          },
        });
      }

      // Untuk Penerima
      await tx.transaction.create({
        data: {
          id: generateId('TRX'),
          title: `Transfer dari ${sender.name}`,
          subtitle: `Dari: ${cleanSenderId}`,
          type: 'in',
          amount: amount,
          source: 'Nasabah App',
          userId: cleanReceiverId,
        },
      });

      return { senderBalance: sender.balance - totalDebit, txId: txOut.id };
    });

    res.json({ message: 'Transfer berhasil', data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 6. POST /pay - Pembayaran QRIS, Top-Up, Tagihan
router.post('/pay', async (req: Request, res: Response) => {
  const { userId, amount, type, target } = req.body;

  if (!userId || !amount || amount <= 0 || !type || !target) {
    return res.status(400).json({ error: 'Input pembayaran tidak lengkap' });
  }

  const cleanUserId = userId.trim().toUpperCase();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: cleanUserId } });
      if (!user || user.status !== 'active') {
        throw new Error('Akun tidak aktif atau tidak ditemukan');
      }

      // Cooldown & Limit Harian
      const lastTx = await tx.transaction.findFirst({
        where: { userId: cleanUserId, source: 'Nasabah App' },
        orderBy: { createdAt: 'desc' },
      });
      if (lastTx) {
        const timeDiff = (Date.now() - new Date(lastTx.createdAt).getTime()) / 1000;
        if (timeDiff < 10) {
          throw new Error(`Transaksi terlalu cepat! Cooldown aktif, mohon tunggu ${Math.ceil(10 - timeDiff)} detik lagi.`);
        }
      }

      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const dailyTxCount = await tx.transaction.count({
        where: {
          userId: cleanUserId,
          createdAt: { gte: oneDayAgo },
        },
      });
      if (dailyTxCount >= 10) {
        throw new Error('Batas maksimal 10 transaksi harian tercapai untuk akun Anda.');
      }

      // Menentukan partner penampung dana agar uang tetap dalam peredaran (circulating)
      let targetEntityId = 'MARKETPLACE';
      if (type === 'topup') targetEntityId = 'LOGISTICS';
      if (type === 'tagihan') targetEntityId = 'SUPPLIER';

      const targetEntity = await tx.user.findUnique({ where: { id: targetEntityId } });
      if (!targetEntity) {
        throw new Error('Entitas ekosistem tujuan tidak ditemukan');
      }

      // Deduct balance dari user
      if (user.balance < amount) {
        throw new Error(`Saldo tidak mencukupi untuk melakukan pembayaran sebesar Rp ${amount.toLocaleString('id-ID')}`);
      }

      await tx.user.update({
        where: { id: cleanUserId },
        data: { balance: { decrement: amount } },
      });

      // Tambahkan saldo ke entitas ekosistem partner
      await tx.user.update({
        where: { id: targetEntityId },
        data: { balance: { increment: amount } },
      });

      // Catat Ledger Transaksi
      const txId = generateId('TRX');
      
      // User Transaction (Out)
      await tx.transaction.create({
        data: {
          id: txId,
          title: `Pembayaran ${type.toUpperCase()} - ${target}`,
          subtitle: `Ke: ${targetEntityId}`,
          type: 'out',
          amount: amount,
          source: 'Nasabah App',
          userId: cleanUserId,
        },
      });

      // Partner Transaction (In)
      await tx.transaction.create({
        data: {
          id: generateId('TRX'),
          title: `Penerimaan Pembayaran ${type.toUpperCase()}`,
          subtitle: `Dari: ${user.name} (${cleanUserId})`,
          type: 'in',
          amount: amount,
          source: 'Nasabah App',
          userId: targetEntityId,
        },
      });

      return { balance: user.balance - amount, txId };
    });

    res.json({ message: 'Pembayaran berhasil diproses', data: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 7. POST /loan - Pengajuan Pinjaman oleh Nasabah
router.post('/loan', async (req: Request, res: Response) => {
  const { userId, amount } = req.body;

  if (!userId || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Input pinjaman tidak valid' });
  }

  const cleanUserId = userId.trim().toUpperCase();

  // Aturan Keuangan #14: Limit Pinjaman = Rp 100.000
  if (amount > 100000) {
    return res.status(400).json({ error: 'Batas maksimal pengajuan pinjaman adalah Rp 100.000' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: cleanUserId } });
      if (!user || user.status !== 'active') {
        throw new Error('Akun tidak aktif atau tidak ditemukan');
      }

      // Check for pending loan
      const pendingLoan = await tx.loan.findFirst({
        where: { userId: cleanUserId, status: 'pending' },
      });
      if (pendingLoan) {
        throw new Error('Anda sudah memiliki pengajuan pinjaman yang berstatus pending.');
      }

      // Aturan Keuangan #13: Bunga Pinjaman 10%
      const totalWithInterest = Math.floor(amount * 1.10);
      const loanId = generateId('LOAN');

      const loan = await tx.loan.create({
        data: {
          id: loanId,
          userId: cleanUserId,
          amount,
          totalWithInterest,
          status: 'pending',
        },
      });

      return loan;
    });

    res.json({ message: 'Pengajuan pinjaman berhasil dikirim', loan: result });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// 8. GET /loans/:userId - Lihat Status Pinjaman Nasabah
router.get('/loans/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;

  try {
    const loans = await prisma.loan.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
    });
    res.json(loans);
  } catch (error) {
    res.status(500).json({ error: 'Gagal mengambil data pinjaman' });
  }
});

export default router;
