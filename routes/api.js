/*
*
*
*       Complete the API routing below
*
*
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







module.exports = function (app) {
  
  app.use(requestIp.mw())

  app.route('/api/stock-prices')
    .get(function (req, res){
      const stock = req.query.stock
      const like = req.query.like;
      const oneStockInRequest = typeof stock === 'string';
      const twoStocksInRequest = typeof stock === 'object';
    
      if (oneStockInRequest && like) {
        
        const clientIp = req.clientIp;
        console.log(clientIp)
        
        getNasdaqData(stock)
        .then(data => {
          const companyIsListedInNasdaq = (data !==  'Unknown symbol') && (data !==  'Invalid symbol');
          
          if (companyIsListedInNasdaq) {
            const record = new stockDataHandler(data.symbol, data.latestPrice);
            stockModel.findOne({stock: record.stockData.stock}, (error, response) => {
              if (error) {
                res.send(error.message)
              }
              else {
                if (response === null) {
                  const stockToStoreInDB = new stockModel({
                    stock: record.stockData.stock,
                    likes: [clientIp]
                  })
                  stockToStoreInDB.save((error2, response2) => {
                    if (error2) {
                      res.send(error.message)
                    }
                    else{
                      res.json({...record, likes: 1});
                    }
                  })
                }
                else {
                  //Obsłużyć przypadek gdy company jest w Nasdaq i figuruje już w DB
                  res.json(response)
                }
              }
            })      
          }
          else {
            res.send('Company is not listed on NASDAQ.')
          }
        })
        
        
      //  console.log(clientIp)
      //   res.send('string and like')
       }
    
      else if (oneStockInRequest && !like) {   
               
        getNasdaqData(stock)
        .then(data=>{
          const record = new stockDataHandler(data.symbol, data.latestPrice);
          stockModel.findOne({stock: record.stockData.stock}, (error, response) =>{
            if (error) {
              res.send(error.message)
            }
            else {
              console.log(response)
              response !== null ? res.json({...record, likes: response.likes.length}) : res.json({...record, likes: 0})
            }  
          })
        });
    
      }
      else if (twoStocksInRequest && like) {
        res.send('2 strings and like')
      }
      else if(twoStocksInRequest && !like) {
        res.send('2 strings, no like')
      }
      else {
        res.json({"stockData":{"likes":0}})
      }
    });
    
};
