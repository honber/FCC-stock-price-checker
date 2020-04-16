/*
*
*
*       FILL IN EACH FUNCTIONAL TEST BELOW COMPLETELY
*       -----[Keep the tests in the same order!]-----
*       (if additional are added, keep them at the very end!)
*/
'use strict'

const chaiHttp   = require('chai-http');
const chai       = require('chai');
const assert     = chai.assert;
const server     = require('../server');
const mongoose   = require('mongoose');
const stockModel = require('../models/stock.js');

chai.use(chaiHttp);

suite('Functional Tests', () => {
    
    suite('GET /api/stock-prices => stockData object', () => {
      
      test('1 stock', done => {
       chai.request(server)
        .get('/api/stock-prices')
        .query({stock: 'abc'})
        .end((err,res) => {
          assert.equal(res.status, 200);
          assert.property(res.body.stockData, 'stock');
          assert.property(res.body.stockData, 'price');
          assert.property(res.body.stockData, 'likes');
          assert.equal(res.body.stockData.stock, 'ABC');         
          done();
        });
      });
      
      test('1 stock with like', done => {
        chai.request(server)
         .get('/api/stock-prices')
         .query({stock: 'abc', like: true})
         .end((err, res) => {
            assert.equal(res.status, 200);
            assert.property(res.body.stockData, 'stock');
            assert.property(res.body.stockData, 'price');
            assert.property(res.body.stockData, 'likes');
            assert.equal(res.body.stockData.stock, 'ABC');  
            assert.equal(res.body.stockData.likes, 1);  
            done();
        });
      });
      
      test('1 stock with like again (ensure likes arent double counted)', done => {
        chai.request(server)
         .get('/api/stock-prices')
         .query({stock: 'abc', like: true})
         .end((err, res) => {
            assert.equal(res.status, 200);
            assert.property(res.body.stockData, 'stock');
            assert.property(res.body.stockData, 'price');
            assert.property(res.body.stockData, 'likes');
            assert.equal(res.body.stockData.stock, 'ABC');  
            assert.equal(res.body.stockData.likes, 1);  
            done();
        });
      });
      
      test('2 stocks', done => {
        chai.request(server)
         .get('/api/stock-prices')
         .query({stock: ['abc', 'i']})
         .end((err, res) => {
           assert.equal(res.status, 200);
           assert.property(res.body.stockData[0], 'stock');
           assert.property(res.body.stockData[0], 'price');
           assert.property(res.body.stockData[0], 'rel_likes');
           assert.equal(res.body.stockData[0].rel_likes, 1); 
           done();
        })
      });
      
      test('2 stocks with like', done => {
        chai.request(server)
         .get('/api/stock-prices')
         .query({stock: ['abc', 'i'], like: true})
         .end((err, res) =>{
           assert.equal(res.status, 200);
           assert.property(res.body.stockData[0], 'stock');
           assert.property(res.body.stockData[0], 'price');
           assert.property(res.body.stockData[0], 'rel_likes');
           assert.equal(res.body.stockData[0].rel_likes, 0);      
           done();
        });
      });
    });
});

// Deleting test records for stock='abc' and stock='i' from DB in order to pass tests next time
stockModel.deleteOne({stock: 'ABC'}, (error, response) => {
  if (error) { console.log(error)}
  return response;
});
stockModel.deleteOne({stock: 'I'}, (error, response) => {
  if (error) { console.log(error)}
  return response;
});  