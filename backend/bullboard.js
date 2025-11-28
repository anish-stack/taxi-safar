// config/bullBoard.js
const { ExpressAdapter } = require('@bull-board/express');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ridePostNotifications } = require('./queues/RidePostNotifications');



const setupBullBoard = (app) => {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullAdapter(ridePostNotifications)],
    serverAdapter,
  });



  app.use('/admin/queues', serverAdapter.getRouter());
  
  console.log('🔧 Bull Board dashboard available at: /admin/queues');
  
  return serverAdapter;
};

module.exports = setupBullBoard;