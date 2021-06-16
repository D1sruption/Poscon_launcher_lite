const ipcRenderer = require('electron').ipcRenderer
const app = require('electron').remote.app
const appVersion = require('electron').remote.app.getVersion()
const remote = require('electron').remote
const child_process = require('child_process')
const poscon = require('poscon-api-client')
const https = require('https')
const log = require('electron-log')

let userName;
let signedIn = false;
let at;

window.$ = window.jQuery = require('jquery')

document.addEventListener('DOMContentLoaded', pageLoaded)

function pageLoaded () {
  // This code will run after the page has been loaded
  
  //********SET UPDATER DEFAULTS*********//
  $('#prgDL').attr('aria-valuenow', 0).css('width', 0);

  // set default text upon load
  if (!signedIn) {
    $('#btnAuthorize').text('Sign In...')
    $('#btnUsername').text(' ')
    $('#btnForce').text('Force')
    $('#btnRefreshToken').text(' ')
  }

  $('#titlebar_lblversion').text('v' + appVersion + '-dev')

  // set titlebar functionality
  $('#titlebar_btnclose').click(function () {
    // send close event to main
    poscon.auth.off('tokenchange')
    app.quit()
    remote.getCurrentWindow().close()
  })

  $('#test2').click(function () {
    // send close event to main
    remote.getCurrentWindow().close()
  })

  $('#titlebar_btnmin').click(function () {
    remote.BrowserWindow.getFocusedWindow().minimize()
  })

  // authorize button pressed
  $('#btnAuthorize').click(function () {
    // alert("click");
    if (signedIn) {
      signout()
    } else {
      login()
    }
  })

  $('#btnRefreshToken').click(function () {
    if (signedIn) {
      // refresh token
      login()
      log.info('Attempting token refresh...')
    }
  })

  $('#btnForce').click(function() {
    if(signedIn) {
      signout()
     poscon.auth.authorize(false, true/* pop up browser when necessary */)
    }
  })

  $('#btnCopyToken').click(function() {
    copyStringToClipboard(at);
    showToast();
  });

  $('#btnClearSettings').click(function() {
    log.warn("Requested to clear settings!");
    ipcRenderer.send("clear-settings");
  });

  $('#btnClearJWT').click(function() {
    log.warn("Requested to clear JWT!");
    poscon.auth.clear();
  });

  // username button pressed
  $('#btnUsername').click(function () {
    if (signedIn) {
      child_process.execSync((() => {
        switch (process.platform) {
          case 'win32':
            return 'start ' + 'https://hq.poscon.net/en/'
          case 'darwin':
            return `open "https://hq.poscon.net/en/"`
          default:
            return `sensible-browser "https://hq.poscon.net/en/"`
        }
      })())
    }
  });

  $('#btnShowUpdater').click(function() {
    log.info("IPC sent show updater");
    ipcRenderer.send('show-client-updater');
  });
}

function showToast() {
  // Get the snackbar DIV
  var x = document.getElementById("snackbar");

  // Add the "show" class to DIV
  x.className = "show";

  // After 3 seconds, remove the show class from DIV
  setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
}

//utility function
function copyStringToClipboard (str) {
  // Create new element
  var el = document.createElement('textarea');
  // Set value (string to be copied)
  el.value = str;
  // Set non-editable to avoid focus and move outside of view
  el.setAttribute('readonly', '');
  el.style = {position: 'absolute', left: '-9999px'};
  document.body.appendChild(el);
  // Select text inside element
  el.select();
  // Copy text to clipboard
  document.execCommand('copy');
  // Remove temporary element
  document.body.removeChild(el);
  log.info("String copied: " + str)
}

// authorization section
const init = (async () => {
  log.info('SignedIn = ' + signedIn)
  let signedin = signedIn // may want to cache the token instead of a boolean
  async function onTokenChange (token) {
    if (token) {
      // will end up here twice in case of refresh
      if (!signedin) { // don't hi twice
        signedin = true
        console.log(`Hi, ${token.claims.preferred_username}!`)
        log.info(`Hi, ${token.claims.preferred_username}!`)
        // UPDATE: Set innerHTML via ipc messaging
        userName = token.claims.preferred_username
        // alert(userName);
        $('#btnUsername').text(userName)
        $('#btnAuthorize').text('Sign Out')
        $('#btnForce').text('Force')
        $('#btnRefreshToken').text('Refresh Token')
        signedIn = true
        at = token.access_token;
      }
    } else if (signedin) {
      signedin = false
      console.log('Signed out')
      log.warn('Signed out')
    } else {
      // couldn't refresh. app stays open for 60 days?
      console.warn('Not signed in')
      log.warn('Not signed in')
    }
  }
  poscon.auth.on('tokenchange', onTokenChange)
  // when user intend to sign in
  {
    const token = await poscon.auth.authorize(true, false/* pop up browser when necessary */)
    log.info('tokenchange detected...silent = true, not passing force')
    if (token) {
      await onTokenChange(token) // onTokenChange would already be called in case of refresh
    } else {
      console.warn('Waiting for user interaction in external browser')
      log.warn('Waiting on user interaction in external browser')
      // onTokenChange will be called back if a new token is granted
    }
  }
})()

async function getUserinfo (access_token) {
  return JSON.parse(await new Promise((resolve, reject) => {
    https.get('https://secure.poscon.net/oauth2/userinfo', {
      headers: {
        Authorization: 'Bearer ' + access_token
      }
    }, res => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.once('end', () => { resolve(data) })
    }).once('error', e => { reject(e) })
  }))
}

async function login () {
  // in case the access_token has expired, authorize() will automatically attempt to refresh it
  const token = await poscon.auth.authorize(false, false)

  log.warn('Detected expired token...silent = true, not passing force')
  if (token) {
    // Access Token for security-critical APIs
    {
      const access_token = token.access_token // always keep refresh_token secret!
      console.log(`Using ${access_token} to call new APIs on behalf of ${token.claims.preferred_username}`)
      log.info(`Authorized...Welcome back ${token.claims.preferred_username}`)
      log.info(`Current LDAPID: ${token.claims.ldapid}`)
      // let's try to use the access_token now
      try {
        const userinfo = await getUserinfo(access_token)
        signedIn = true
        $('#btnUsername').text(token.claims.preferred_username)
        $('#btnAuthorize').text('Sign Out')
        $('#btnRefreshToken').text('Refresh Token')
        log.info('New Token Expiration: ' + token.claims.exp)
        // console.log(userinfo);
      } catch (ex) {
        // alert(ex.toString());
        console.error('Hmm, could not get user info')
        log.error('ERROR: Couldnt get user info')
      }
    }
    // ID Token for general APIs
    {
      const jwt = token.id_token // always keep refresh_token secret!
      // console.log('JWT to call general APIs: ' + jwt);
    }
  } else {
    console.warn('Please sign in first')
    log.warn('Please sign in first')
  }
}
// Signs out
async function signout () {
  await poscon.auth.clear()
  //poscon.auth.on("tokenchange", null);
  $('#btnUsername').text(' ')
  $('#btnRefreshToken').text(' ')
  $('#btnForce').text(' ')
  $('#btnAuthorize').text('Sign In')
  signedIn = false
  log.warn('User logged out!')
  // onTokenChange will be called back if a token existed
}
// wait for init
init.then(async () => {
  // let's try to do something after init
  await login()
  // log.info("awaiting login!");
  // console.log('example ends here');
})
