/*
  API serves 4 scenarios:
1. When I type in input (testForm2) company symbol without checking like (testForm2), API cheks if company is listed in Nasdaq and if it is stored in my DB. After then returns an object.
2. When I type in input (testForm2) company symbol and I check like (testForm2), API cheks if if company is listed in Nasdaq (if it is not - returns information)
   If company is listed in Nasdaq and not stored in my DB - new record is stored in DB, and object is returned (likes: 1)
   If company is listed in Nasdaq and stored in my DB - API ckecks if IP of client, which sent a request is equal to any of IPs stored in likes Array: no -> adds client's IP to likes Array.
   




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

/*      const test = new stockModel({stock: 'GOOG', likes: ['1.1.1.1', '2.2.2.2']});
        test.save((err, res) => {
          if (err){console.log(err)}
          else{console.log('OK');}
        }) */


function companyIsListedInNasdaq(data) {
  const isNotListed = ['Unknown symbol', 'Invalid symbol'];
  return isNotListed.includes(data) ? false: true;
  
}


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
        const stockData = await getNasdaqData(stock);
        if (!companyIsListedInNasdaq(stockData)) { return res.send('Company is not listed on NASDAQ.'); } 
        const record = new stockDataHandler(stockData.symbol, stockData.latestPrice);
        const stockDataFromDB = await stockModel.findOne({stock: record.stock}, (error, response) =>{
            if (error) { res.send(error.message) }
            return response
        });
        return stockDataFromDB !== null 
          ? 
          res.json({stockData: {...record, likes: stockDataFromDB.likes.length}}) 
          : 
          res.json({stockData: {...record, likes: 0}}) 
      }
    
    
      else if (twoStocksInRequest && like) {
        res.send('2 strings and like')
      }
    
    
      else if(twoStocksInRequest && !like) {
        let record1, record2 = {};
        let stock1LikesCount, stock2LikesCount;
        let relLikes1, relLikes2;
        let result1, result2;
        const stock1 = stock[0];
        const stock2 = stock[1];
        
        let stock1Data = await getNasdaqData(stock1);
        if (!companyIsListedInNasdaq(stock1Data)) {  stock1LikesCount = 0 }
        else { 
          record1 = new stockDataHandler(stock1Data.symbol, stock1Data.latestPrice); 
          const stock1DataFromDB = await stockModel.findOne({stock: record1.stock}, (error, response) => {
            if (error) { res.send(error.message) }
            return response
          })
          stock1DataFromDB === null ? stock1LikesCount = 0 : stock1LikesCount = stock1DataFromDB.likes.length;
        }
              
        let stock2Data = await getNasdaqData(stock2);
        if (!companyIsListedInNasdaq(stock2Data)) { stock2LikesCount = 0 } 
        else {
          record2 = new stockDataHandler(stock2Data.symbol, stock2Data.latestPrice);   
          const stock2DataFromDB = await stockModel.findOne({stock: record2.stock}, (error, response) => {
            if (error) { res.send(error.message) }
            return response
          })
          stock2DataFromDB === null ? stock2LikesCount = 0 : stock2LikesCount = stock2DataFromDB.likes.length;          
        }
        
        
        relLikes1 = stock1LikesCount - stock2LikesCount;
        relLikes2 = stock2LikesCount - stock1LikesCount;
        
        result1 = {...record1, rel_likes: relLikes1}
        result2 = {...record2, rel_likes: relLikes2}
        
        res.json({stockData: [result1, result2]});

      }
    
    
    
    
      else {
        res.json({"stockData":{"likes":0}})
      }
    });
    
};
