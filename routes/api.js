/*
  API serves 4 scenarios:
1. When I type in input (testForm2) company symbol without checking like (testForm2), API cheks if company is listed in Nasdaq and if it is stored in my DB. After then returns an object.
2. When I type in input (testForm2) company symbol and I check like (testForm2), API cheks if if company is listed in Nasdaq (if it is not - returns information)
   If company is listed in Nasdaq and not stored in my DB - new record is stored in DB, and object is returned (likes: 1)
   If company is listed in Nasdaq and stored in my DB - API ckecks if IP of client, which sent a request is equal to any of IPs stored in likes Array: no -> adds client's IP to likes Array.
*/


/*      const test = new stockModel({stock: 'GOOG', likes: ['1.1.1.1', '2.2.2.2']});
        test.save((err, res) => {
          if (err){console.log(err)}
          else{console.log('OK');}
        }) 
*/


//http://eoddata.com/stocklist/NASDAQ.htm

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
  if (!companyIsListedInNasdaq(stockData)) { return 'Company is not listed on NASDAQ.'; } 
  const record = new stockDataHandler(stockData.symbol, stockData.latestPrice);
  const stockDataFromDB = await stockModel.findOne({stock: record.stock}, (error, response) =>{
    if (error) { console.log(error.message); }
    return response
  });
  return stockDataFromDB !== null 
  ? 
  ({stockData: {...record, likes: stockDataFromDB.likes.length}}) 
  : 
  ({stockData: {...record, likes: 0}}) 
}

async function prepareOneStockDataWhenLikeIsChecked(stockName) {
}

async function prepareStockDataOneOfTwo(stockName) {
  let stockLikesCount = 0;
  let record = {};  
  let stockData = await getNasdaqData(stockName);
    if (companyIsListedInNasdaq(stockData)) { 
      record = new stockDataHandler(stockData.symbol, stockData.latestPrice); 
      const stockDataFromDB = await stockModel.findOne({stock: record.stock}, (error, response) => {
        if (error) { console.log(error.message) }
        return response
      })
      stockDataFromDB === null ? stockLikesCount = 0 : stockLikesCount = stockDataFromDB.likes.length;    
    }
    record.likes = stockLikesCount;
    return record;
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

        const stockData = await getNasdaqData(stock);
        if (!companyIsListedInNasdaq(stockData)) { return res.send('Company is not listed on NASDAQ.'); } 
        const record = new stockDataHandler(stockData.symbol, stockData.latestPrice);
        const stockDataFromDB = await stockModel.findOne({stock: record.stock}, (error, response) => {
            if (error) { res.send(error.message); }
            return response;
        });
      
        // company is listed in Nasdaq but not stored in my DB 
        if (stockDataFromDB === null) { 
          const stockToStoreInDB = new stockModel({
            stock: record.stock,
            likes: [clientIp]
          });
          stockToStoreInDB.save((error, response) => {
            if (error) { res.send(error.message); }
            return res.json({stockData: {...record, likes: 1}});
          });
        }
          
        // company is listed in Nasdaq, stored in my DB and client's IP is listed in 'likes' array
        if (stockDataFromDB.likes.includes(clientIp)) { return res.json({stockData: {...record, likes: stockDataFromDB.likes.length}}); }

        // company is listed in Nasdaq, stored in my DB but client's IP is not listed in 'likes' array
        stockModel.findByIdAndUpdate(stockDataFromDB._id, {likes: [...stockDataFromDB.likes, clientIp]}, {new: true}, (error, response) => {
          if (error) { res.send(error.message); }
          return res.json( {stockData: {...record, likes: response.likes.length}});    
        });
      }
         
    
      else if (oneStockInRequest && !like) {   
        const record = await prepareOneStockData(stock);
        res.json(record);
      }
    
      else if (twoStocksInRequest && like) {
        res.send('2 strings and like')
      }
    
      else if(twoStocksInRequest && !like) {
        const stock1 = stock[0];
        const stock2 = stock[1];
        const record1 = await prepareStockDataOneOfTwo(stock1);
        const record2 = await prepareStockDataOneOfTwo(stock2);
        
        const relLikes1 = record1.likes - record2.likes;
        const relLikes2 = record2.likes - record1.likes;
        record1.rel_likes = relLikes1;
        record2.rel_likes = relLikes2;
        delete record1.likes;
        delete record2.likes;
        
        res.json({stockData: [record1, record2]});        
      }
    
      else {
        res.json({"stockData":{"likes":0}})
      }
    });
    
};
