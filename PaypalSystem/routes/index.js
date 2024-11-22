var express = require('express');
var router = express.Router();
const Wallet = require('../models/wallet');
const User = require('../models/User');
const Transaction = require('../models/transaction');

// ROUTE TO RENDER HOME PAGE 
router.get('/', async function (req, res, next) {
  if (req.isAuthenticated()) {
    try {
      const userId = req.user.id;

      const wallet = await Wallet.findOne({ where: { userId } });
      res.render('index', {
        title: 'PayPal System',
        user: req.user,
        wallet: wallet ? wallet : { balance: 0 }
      });
    } catch (err) {
      console.error(err);
      res.status(500).send('Error fetching wallet data');
    }
  } else {
    res.render('index', { title: 'PayPal System', user: null });
  }
});

// ROUTE TO HANDLE ADDING MONEY TO THE WALLET
router.post('/add-money', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }

  try {
    const userId = req.user.id;
    const amount = parseFloat(req.body.amount);

    // Validate the amount
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).send('Invalid amount');
    }

    // Find or create a wallet for the user
    let wallet = await Wallet.findOne({ where: { userId } });

    if (!wallet) {
      wallet = await Wallet.create({ userId, balance: amount });
    } else {
      // If wallet exists, update the balance
      wallet.balance += amount;
      await wallet.save();
    }

    // Redirect back to the home page with updated wallet balance
    res.redirect('/');
  } catch (err) {
    console.log(err);
    res.status(500).send('Something went wrong');
  }
});

// ROUTE TO HANDLE SENDING MONEY
router.post('/send-money', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/users/login');
  }

  const { recipient_email, amount } = req.body;

  try {
    const sender = req.user;
    const recipient = await User.findOne({ where: { email: recipient_email } });

    if (!recipient) {
      return res.status(400).send('Recipient not found.');
    }

    if (sender.email === recipient.email) {
      return res.status(400).send('You cannot send money to yourself.');
    }

    // Check sender's wallet balance
    const senderWallet = await Wallet.findOne({ where: { userId: sender.id } });

    if (!senderWallet || senderWallet.balance < amount) {
      return res.status(400).send('Insufficient balance.');
    }

    // Deduct amount from sender's wallet
    senderWallet.balance -= amount;
    await senderWallet.save();

    // Add amount to recipient's wallet
    let recipientWallet = await Wallet.findOne({ where: { userId: recipient.id } });
    if (!recipientWallet) {
      recipientWallet = await Wallet.create({ userId: recipient.id, balance: 0 });
    }
    recipientWallet.balance += amount;
    await recipientWallet.save();

    // Create a transaction record
    await Transaction.create({
      senderId: sender.id,
      recipientId: recipient.id,
      amount,
      status: 'Completed'
    });

    res.send(`Successfully sent ${amount} to ${recipient.email}. New balance: $${senderWallet.balance}`);
  } catch (err) {
    console.log(err);
    res.status(500).send('Something went wrong.');
  }
});

// ROUTE TO DISPLAY TRANSACTION HISTORY
router.get('/transactions', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect('/users/login');
  }

  try {
    const userId = req.user.id;

    const sentTransactions = await Transaction.findAll({
      where: { senderId: userId },
      include: [
        {
          model: User,
          as: 'recipient',
          attributes: ['username', 'email']
        }
      ]
    });

    const receivedTransactions = await Transaction.findAll({
      where: { recipientId: userId },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['username', 'email']
        }
      ]
    });

    res.render('transactions', {
      title: 'Transaction History',
      sent_transactions: sentTransactions,
      received_transactions: receivedTransactions,
      error: null,
      user: req.user,
    });
  } catch (err) {
    console.log(err);
    res.render('transactions', {
      title: 'Transaction History',
      sent_transactions: [],
      received_transactions: [],
      error: 'Error fetching transaction history'
    });
  }
});

module.exports = router;
