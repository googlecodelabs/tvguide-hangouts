'use strict';

process.env.DEBUG = 'dialogflow:debug';

const functions = require('firebase-functions');
const moment = require('moment');
const TVGUIDE_WEBSERVICE = 'https://tvguide-e4s5ds5dsa-ew.a.run.app/channel';
const { WebhookClient, Payload } = require('dialogflow-fulfillment');
var results = null;


/* When the Test Intent gets invoked. */
function testHandler(agent) {
    console.log('in test handler');
    let text = 'This is a test message, when you see this, it means your webhook fulfillment worked!';
    agent.add(text);
}

/* When the Channel Intent gets invoked. */
function channelHandler(agent) {
    console.log('in channel handler');
    var jsonResponse = `{"ID":10,"Listings":[{"Title":"Catfish Marathon","Date":"2018-07-13","Time":"11:00:00"},{"Title":"Videoclips","Date":"2018-07-13","Time":"12:00:00"},{"Title":"Pimp my ride","Date":"2018-07-13","Time":"12:30:00"},{"Title":"Jersey Shore","Date":"2018-07-13","Time":"13:00:00"},{"Title":"Jersey Shore","Date":"2018-07-13","Time":"13:30:00"},{"Title":"Daria","Date":"2018-07-13","Time":"13:45:00"},{"Title":"The Real World","Date":"2018-07-13","Time":"14:00:00"},{"Title":"The Osbournes","Date":"2018-07-13","Time":"15:00:00"},{"Title":"Teenwolf","Date":"2018-07-13","Time":"16:00:00"},{"Title":"MTV Unplugged","Date":"2018-07-13","Time":"16:30:00"},{"Title":"Rupauls Drag Race","Date":"2018-07-13","Time":"17:30:00"},{"Title":"Ridiculousness","Date":"2018-07-13","Time":"18:00:00"},{"Title":"Punk'd","Date":"2018-07-13","Time":"19:00:00"},{"Title":"Jersey Shore","Date":"2018-07-13","Time":"20:00:00"},{"Title":"MTV Awards","Date":"2018-07-13","Time":"20:30:00"},{"Title":"Beavis & Butthead","Date":"2018-07-13","Time":"22:00:00"}],"Name":"MTV"}`;
    var results = JSON.parse(jsonResponse);
    var listItems = {};
    textResults = getListings(results);

    for (var i = 0; i < results['Listings'].length; i++) {
        listItems[`SELECT_${i}`] = {
            title: `${getShowTime(results['Listings'][i]['Time'])} - ${results['Listings'][i]['Title']}`,
            description: `Channel: ${results['Name']}`
        }
    }

    if (agent.requestSource === 'hangouts') {
         const cardJSON = getHangoutsCard(results);
         const payload = new Payload(
            'hangouts',
            cardJSON,
            {rawPayload: true, sendAsMessage: true},
        );
        agent.add(payload);
    } else {
        agent.add(textResults);
    }
}

/**
 * Return a text string of the listings
 * @param {object} JSON tv results
 */
var getListings = function(tvresults) {
    let s = "";
    if(tvresults['Listings'][0]) {
        let channelName = tvresults['Name'];
        let currentlyPlayingTime = getShowTime(tvresults['Listings'][0]['Time']);
        let laterPlayingTime = getShowTime(tvresults['Listings'][1]['Time']);
        s = `On ${channelName} from ${currentlyPlayingTime}, ${tvresults['Listings'][0]['Title']} is playing.
        Afterwards at ${laterPlayingTime}, ${tvresults['Listings'][1]['Title']} will start.`
    }
    return s;
}

/**
 *  Return a Hangouts Chat Card in JSON
 * @param {Object} JSON tv results 
 */
var getHangoutsCard = function(tvresults) {
    console.log('In hangouts card, tv results: ' + JSON.stringify(tvresults));

    if(tvresults['Listings'][0]) {
        let channelName = tvresults['Name'];
        let currentlyPlayingTime = getShowTime(tvresults['Listings'][0]['Time']);
        let laterPlayingTime = getShowTime(tvresults['Listings'][1]['Time']);

        const cardHeader = {
            title: channelName + ' Shows',
        };

        const currentWidget = {
            keyValue: {
                content: `${tvresults['Listings'][0]['Title']}`,
                bottomLabel: `${currentlyPlayingTime}`,
            }
        };

        const laterWidget = {
            keyValue: {
                content: `${tvresults['Listings'][1]['Title']}`,
                bottomLabel: `${laterPlayingTime}`
            }
        };

        const buttonWidget = {
            buttons: [
              {
                textButton: {
                  text: 'View Full Listing',
                  onClick: {
                    openLink: {
                      url: TVGUIDE_WEBSERVICE + '/' + tvresults['ID'],
                    },
                  },
                },
              },
            ],
          };

        return {
            'hangouts': {
                header: cardHeader,
                sections: [{widgets: [currentWidget, laterWidget, buttonWidget]}],
            }
        };
    } else {
        const errorWidget = {
            keyValue: {
                content: 'No listings found',
                bottomLabel: 'Please try again.'
            }
        };
        return {
            'hangouts': {
                'sections': {widgets: [errorWidget]},
            }
        };
    }
}

/**
 * Return a natural time.
 * @param {string} time in 'HH:mm:ss' format
 * @returns {string} spoken time (like 8 30 pm i.s.o. 20:00:00)
 */
var getShowTime = function(time){
    let datetime = moment(time, 'HH:mm:ss');
    let min = moment(datetime).format('m');
    let hour = moment(datetime).format('h');
    let partOfTheDay = moment(datetime).format('a');

    if (min == '0') {
        min = '';
    }

    return `${hour} ${min} ${partOfTheDay}`;
};

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    var agent = new WebhookClient({ request, response });
   
    let channelInput = request.body.queryResult.parameters.channel;
    let requestedTime = request.body.queryResult.parameters.time;
    let url = `${TVGUIDE_WEBSERVICE}/${channelInput}`;

    var intentMap = new Map();
    intentMap.set('Test Intent', testHandler);
    intentMap.set('Channel Intent', channelHandler);
    agent.handleRequest(intentMap);
});
