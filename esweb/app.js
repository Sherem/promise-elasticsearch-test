'use strict';

var elasticSearch = require('elasticsearch');
var util = require('util');

var debate = require('debate');
var Entities =require('html-entities').XmlEntities;
var entities = new Entities();
var sprintf = require("sprintf-js").sprintf;

const esAddr = "192.168.99.100:9200";
const indexName = 'corp';

var client = new elasticSearch.Client({
    host: esAddr,
    apiVersion: '1.5',
    log: 'trace'
});

var restOptions = {
    formatters: {
        'application/json; charset=utf-8': function(data) {
            try {
                var parsed = JSON.parse(data);
                return parsed;
            }
            catch (err) {
                return data;
            }
        }
    }
};


console.log('Elastic search test');


function printError(err) {
    console.log('Error: ' + err.toString());
    process.exit(1);
}


client.ping({requestTimeout: 30000, hello: "elasticsearch"}).then(()=> console.log('hello'))
    .then(()=>debate.rest.del(sprintf('http://%s/%s',esAddr,indexName)))
    .then(()=>debate.rest.get('http://api.uinames.com/?amount=100&region=united+states&minlen=3', restOptions))
    .then((result)=> {
        if (!result.data || !util.isArray(result.data)) {
            throw 'No result';
        }
        return Promise.all(result.data.map((person, index)=>
            debate.rest.get(sprintf('http://api.icndb.com/jokes/random?firstName=%(name)s&lastName=%(surname)s',person))
                .then((result)=> {
                    person.age = Math.round((Math.random() * 80 + 5));
                    person.message = entities.decode(result.data.value.joke);
                    var record = {
                        index: indexName,
                        type: 'person',
                        id: index.toString(),
                        body: person
                    };
                    return client.create(record);
                }
            )))
    }).then(()=> {
    console.log('Created');
    process.exit(0);
}, printError);