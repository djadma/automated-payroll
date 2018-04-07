const fs = require('fs');
const CsvReadableStream = require('csv-reader');
const _ = require('lodash');

async function breakCsv(filePath) {
  const inputStream = fs.createReadStream(filePath, 'utf8');
  let retVal = [];
  return new Promise((resolve, reject) => {
    inputStream
       .pipe(CsvReadableStream({ parseNumbers: true, parseBooleans: true, trim: true }))
       .on('data', function (row) {
           retVal.push(row);
       })
       .on('end', () =>{
         retVal = _.zip.apply(_, retVal)
         resolve(retVal)
       })
  })

}

module.exports = breakCsv;
