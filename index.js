const express = require('express')
const port = process.env.PORT || 3001

// Configure app to use bodyParser to parse json data
const app = express()
app.use(express.json())

const server = require('http').createServer(app)
require('dotenv').config()
const Airtable = require('airtable')
const apiKey = process.env.AIRTABLE_API_KEY
const tableId = process.env.AIRTABLE_TABLE_ID

const base = new Airtable({apiKey}).base(tableId)

// Test server is working (GET http://localhost:3001/)
app.get('/', function (req, res) {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>Signs Prototype API</title>
    </head>
    <body>
      <h1 style="text-align: center; margin: 2rem auto;">Welcome to Signs Prototype API</h1>
      <p style="display: flex; justify-content: center; margin: 1rem auto;">User Agent - ${req.headers['user-agent']}</p>
      </body>
    </html>
  `)
})

// create new record in Airtable
app.post('/create', (req, res) => {
  const {body} = req
  const tableName = req.headers.origin.includes('github.io')
    ? 'Production'
    : 'Development'
  base(tableName).create(
    {
      Sign: body.sign || 'Invalid Sign',
      'Time Elapsed': Math.round(body.timeElapsed / 1000) || 0,
      'Participant Code': body.participantCode,
      'Start Time': body.startTime,
      'End Time': body.endTime,
      'Sign Code': body.signCode,
    },
    function (err, record) {
      if (err) {
        res.status(err.response ? err.response.status : 500)
        res.send(err.message || 'Something went wrong! Please try again later.')
        return
      }
      res.status(200)
      res.send(`Created record-${record.getId()} in table-${tableName}`)
    }
  )
})

// retrieve records in Airtable
app.get('/stats', (req, res) => {
  const tableName = req.headers.host.includes('github.io')
    ? 'Production'
    : 'Development'
  let tableRecords = []
  base(tableName)
    .select({
      // Selecting the first 3 records in Grid view:
      maxRecords: 25,
      view: 'Grid view',
    })
    .eachPage(
      function page(records, fetchNextPage) {
        // This function (`page`) will get called for each page of records.

        records.forEach(function (record) {
          // record.get('Sign')
          tableRecords.push({row: record.fields})
        })

        // To fetch the next page of records, call `fetchNextPage`.
        // If there are more records, `page` will get called again.
        // If there are no more records, `done` will get called.
        fetchNextPage()
      },
      function done(err) {
        if (err) {
          res.status(err.response ? err.response.status : 500)
          res.send(
            err.message || 'Something went wrong! Please try again later.'
          )
          return
        }
        res.status(200)
        res.send(JSON.stringify(tableRecords))
      }
    )
})

// Start the server
server.listen(port)
console.log('Server is listening on port ' + port)
