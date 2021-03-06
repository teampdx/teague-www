const path = require( "path" );
const fs = require( "fs" );
const request = require( "request-promise" );
const core = {
    files: require( "../core/files" ),
    config: require( "../../clutch.config" )
};
const authorization = {
    config: require( "../../sandbox/authorizations/hubspot.config" ),
    store: path.join( __dirname, "../../sandbox/authorizations/hubspot.auth.json" )
};
const lager = require( "properjs-lager" );
const validator = {
    isEmpty ( str ) {
        return (str !== "");
    },
    isEmail ( str ) {
        return /(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/.test( str );
    }
};



const getHubspotAuth = ( req, res ) => {
    // 0.1 Authorization
    if ( !req.query.code ) {
        // https://developers.hubspot.com/docs/methods/oauth2/initiate-oauth-integration
        res.redirect( `https://app.hubspot.com/oauth/authorize?client_id=${authorization.config.clientId}&redirect_uri=${encodeURIComponent( authorization.config.redirectUrl )}&scope=${authorization.config.scope}` );

    // 0.2 Token Request
    } else if ( req.query.code ) {
        getHubspotToken( req, res, "authorization_code", () => {
            res.redirect( `/authorizations/?token=${core.config.authorizations.token}` );
        });
    }
};



const getHubspotToken = ( req, res, grantType, cb ) => {
    const form = {
        grant_type: grantType,
        redirect_uri: authorization.config.redirectUrl,
        client_secret: authorization.config.clientSecret,
        client_id: authorization.config.clientId
    };

    // Handle token refresh on expiration
    if ( grantType === "refresh_token" ) {
        const oauthJson = core.files.read( authorization.store, true );

        form.refresh_token = oauthJson.refresh_token;

    // Handle initial authorization redirect from Oauth2 window
    } else {
        form.code = req.query.code;
    }

    request({
        form,
        url: "https://api.hubapi.com/oauth/v1/token",
        json: true,
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
        }

    }).then(( json ) => {
        json.created_at = Date.now();
        core.files.write( authorization.store, json, true );

        if ( typeof cb === "function" ) {
            cb();
        }
    });
}



const getHubspotAPIData = ( req, res, url ) => {
    const _getReq = () => {
        const oauthJson = core.files.read( authorization.store, true );

        request({
            url: url,
            json: true,
            method: "GET",
            headers: {
                "Authorization": `Bearer ${oauthJson.access_token}`
            }

        }).then(( json ) => {
            res.status( 200 ).json( json );

        }).catch(( error ) => {
            getHubspotToken( req, res, "refresh_token", () => {
                _getReq();
            });
        });
    };

    _getReq();
};



const getHubspotFormByGUID = ( req, res ) => {
    getHubspotAPIData(
        req,
        res,
        `https://api.hubapi.com/forms/v2/forms/${authorization.config.forms[ req.params.guid ] || req.params.guid}`
    );
};



const handleHubspotValid = ( req, res ) => {
    const https = require( "https" );
    const querystring = require( "querystring" );
    const bodyData = {
        hs_context: JSON.stringify({
            "hutk": req.cookies.hubspotutk,
            "ipAddress": req.ip,
            "pageUrl": req.body._page.url,
            "pageName": req.body._page.title
        })
    };

    for ( let i in req.body._form ) {
        if ( req.body._form.hasOwnProperty( i ) ) {
            bodyData[ req.body._form[ i ].name ] = req.body._form[ i ].value;
        }
    }

    const postData = querystring.stringify( bodyData );
    const options = {
        hostname: "forms.hubspot.com",
        path: `/uploads/form/v2/${authorization.config.portalId}/${authorization.config.forms[ req.body._action ]}`,
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": postData.length
        }
    };
    const httpRequest = https.request( options, ( response ) => {
        // lager.info( `Status: ${response.statusCode}`  );
        // lager.info( `Headers: ${JSON.stringify( response.headers )}` );
        response.setEncoding( "utf8" );
        response.on( "data", ( chunk ) => {
            lager.info( `Body: ${chunk}` );
        });

        if ( response.statusCode === 204 ) {
            res.status( 200 ).json({
                success: true
            });
        }
    });

    httpRequest.on( "error", ( e ) => {
        // lager.info( `Problem with request ${e.message}` );
    });
    httpRequest.write( postData );
    httpRequest.end();
};



const handleHubspotErrors = ( req, res ) => {
    res.status( 200 ).json({
        success: false
    });
};



const validateHubspotForm = ( req, res ) => {
    return new Promise(( resolve, reject ) => {
        let isResolve = true;

        for ( let i in req.body._form ) {
            if ( req.body._form.hasOwnProperty( i ) ) {
                const checkEmpty = /^text|^select/.test( req.body._form[ i ].type );
                const checkEmail = /^email/.test( req.body._form[ i ].type );

                if ( checkEmpty && validator.isEmpty( req.body._form[ i ].value ) ) {
                    isResolve = false;
                }

                if ( checkEmail && !validator.isEmail( req.body._form[ i ].value ) ) {
                    isResolve = false;
                }
            }
        }

        if ( isResolve ) {
            resolve();

        } else {
            reject();
        }
    });
};



const postHubspotForm = ( req, res ) => {
    // lager.data( req.body );
    validateHubspotForm( req, res ).then(() => {
        handleHubspotValid( req, res );

    }).catch(() => {
        handleHubspotErrors( req, res );
    });
};



module.exports = {
    init ( expressApp, checkCSRF ) {
        expressApp.get( "/api/hubspot/form/:guid", getHubspotFormByGUID );

        // Possibly use express validator
        // https://express-validator.github.io/docs/
        // https://developers.hubspot.com/docs/methods/forms/submit_form
        expressApp.post( "/api/hubspot/form-newsletter", checkCSRF, postHubspotForm );
        expressApp.post( "/api/hubspot/form-work", checkCSRF, postHubspotForm );
        expressApp.post( "/api/hubspot/form-media", checkCSRF, postHubspotForm );
    },


    auth ( req, res ) {
        getHubspotAuth( req, res );
    }
};
