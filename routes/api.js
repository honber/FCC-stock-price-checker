/*
  API serves 4 scenarios:
1. When I type in input (testForm2) company symbol without checking like (testForm2), API cheks if company is listed in Nasdaq and if it is stored in my DB. 
   After then returns an object.
2. When I type in input (testForm2) company symbol and I check like (testForm2), API cheks if if company is listed in Nasdaq (if it is not - returns information)
   If company is listed in Nasdaq and not stored in my DB - new record is stored in DB, and object is returned (likes: 1)
   If company is listed in Nasdaq and stored in my DB - API ckecks if IP of client, which sent a request is equal to any of IPs stored in likes Array: no -> adds client's 
   IP to likes Array.   
3. When I type in two inputs (testForm) names of 2 companies without checking like (testForm), algoritm is similiar like in po.1, but in returned object instead of 
   "likes property", "rel_likes" is presented (number of likes for one company minus number of likes for second company)
 4. When I type in two inputs (testForm) names of 2 companies and I check like like (testForm) algoritm is similiar like in po.2, but in returned object instead of 
   "likes property", "rel_likes" is presented.
*/

'use strict';

const expect               = require('chai').expect;
const MongoClient          = require('mongodb');
const mongoose             = require('mongoose');
const requestIp            = require('request-ip');
const stockModel           = require('../models/stock.js');
const getNasdaqData        = require('./stockPriceCheckerProxy.js');
const stockDataHandler     = require('../controllers/stockHandler.js');

const CONNECTION_STRING = process.env.MLAB_URI;

function companyIsListedInNasdaq(data) {
  const isNotListed = ['Unknown symbol', 'Invalid symbol'];
  return isNotListed.includes(data) ? false: true;
}

async function prepareOneStockData(stockName) {
  const stockData = await getNasdaqData(stockName);
  if (!companyIsListedInNasdaq(stockData)) { return {likes: 0}; } 
  const record = new stockDataHandler(stockData.symbol, stockData.latestPrice);
  const stockDataFromDB = await stockModel.findOne({stock: record.stock}, (error, response) =>{
    if (error) { console.log(error.message); }
    return response
  });
  return stockDataFromDB !== null 
  ? 
  ({...record, likes: stockDataFromDB.likes.length}) 
  : 
  ({...record, likes: 0}) 
}

async function prepareOneStockDataWhenLikeIsChecked(stockName, currentIP) {
  
  const stockData = await getNasdaqData(stockName);
  if (!companyIsListedInNasdaq(stockData)) { return {likes: 0}; } 
  const record = new stockDataHandler(stockData.symbol, stockData.latestPrice);
  const stockDataFromDB = await stockModel.findOne({stock: record.stock}, (error, response) => {
    if (error) { console.log(error.message); }
    return response;
  });
      
  // company is listed in Nasdaq but not stored in my DB 
  if (stockDataFromDB === null) { 
    const stockToStoreInDB = new stockModel({
      stock: record.stock,
      likes: [currentIP]
    });
    await stockToStoreInDB.save((error, response) => {
      if (error) { console.log(error.message); }
      return response;
    });
    return {...record, likes: 1};
  }
  // company is listed in Nasdaq, stored in my DB and client's IP is listed in 'likes' array
  if (stockDataFromDB.likes.includes(currentIP)) { return {...record, likes: stockDataFromDB.likes.length}; };
  // company is listed in Nasdaq, stored in my DB but client's IP is not listed in 'likes' array
  const result =  await stockModel.findByIdAndUpdate(stockDataFromDB._id, {likes: [...stockDataFromDB.likes, currentIP]}, {new: true}, (error, response) => {
    if (error) { console.log(error.message); }
    return response;
  });
  return {...record, likes: result.likes.length};   
}

function formatDeliveredData(record1, record2) {
  const firstRecord = {...record1};
  const secondRecord = {...record2};
  const relLikes1 = firstRecord.likes - secondRecord.likes;
  const relLikes2 = secondRecord.likes - firstRecord.likes;
  firstRecord.rel_likes = relLikes1;
  secondRecord.rel_likes = relLikes2;
  delete firstRecord.likes;
  delete secondRecord.likes;
  return {stockData: [firstRecord, secondRecord]}
}


const connectOptions = { 
  useFindAndModify: false,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

mongoose.connect(CONNECTION_STRING, connectOptions, err => {
  if (err) {
    console.log('Could NOT connect to database: ', err);
  }
  else {
    console.log('Connection to database succesful'); 
  }
});


module.exports = function (app) {
  
  app.use(requestIp.mw())

  app.route('/api/stock-prices')
    .get(async function (req, res){
      const stock = req.query.stock
      const like = req.query.like;
      const oneStockInRequest = typeof stock === 'string';
      const twoStocksInRequest = typeof stock === 'object';
    
      if (oneStockInRequest && like) {
        const clientIp = req.clientIp;
        console.log(`Client's IP: ${clientIp}`); 
        const record = await prepareOneStockDataWhenLikeIsChecked(stock, clientIp);
        res.json({stockData: record});       
      }
    
      else if (oneStockInRequest && !like) {   
        const record = await prepareOneStockData(stock);
        res.json({stockData: record});
      }
    
      else if (twoStocksInRequest && like) {
        const clientIp = req.clientIp;
        console.log(`Client's IP: ${clientIp}`); 
        const stock1 = stock[0];
        const stock2 = stock[1];
        const record1 = await prepareOneStockDataWhenLikeIsChecked(stock1, clientIp);
        const record2 = await prepareOneStockDataWhenLikeIsChecked(stock2, clientIp);
               
        res.json(formatDeliveredData(record1, record2));
      }
    
      else if(twoStocksInRequest && !like) {
        const stock1 = stock[0];
        const stock2 = stock[1];
        const record1 = await prepareOneStockData(stock1);
        const record2 = await prepareOneStockData(stock2);
                
        res.json(formatDeliveredData(record1, record2));
      }
    
      else {
        res.json({"stockData":{"likes":0}})
      }
    });
    
};
