var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    physics: {
      default: 'arcade',
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }    
};
const PLAYING = 0;
const LOST = 1;
const WIN = 2;
const SPEED = 100;

var game = new Phaser.Game(config);

var gameState = PLAYING;
var t = 0;
var giroXPrev =0;
var avgGiro = 0;
var giroX = 0;
var giroY = 0;
var state = 0;
var focus = 0;
var auth;
var headsetId;
var sessionId;
var socket;

const safeParse = (msg) => { try { return JSON.parse(msg) } catch (_) { return null } }

function getUserLogin(){
  var msg = {
    "jsonrpc": "2.0",
    "method": "getUserLogin",
    "id": 1
    };

  state = 1;
  socket.send( JSON.stringify(msg) );
}

function logIn( ){
  console.log('Not implemented!');
}

function authorize( clientId ){
  var msg =  {
    "jsonrpc": "2.0",
    "method": "authorize",
    "params": {},
    "id": 1
  };

  state = 2;
  socket.send( JSON.stringify(msg) );
}

function queryHeadsets(){
  var msg = {
    "jsonrpc": "2.0",
    "method": "queryHeadsets",
    "params": {},
    "id": 1
  };

  state = 3;
  socket.send( JSON.stringify(msg) );

}

function createSession(){
  var msg = {
    "jsonrpc": "2.0",
    "method": "createSession",
    "params": {
      "_auth": auth,
      "headset": headsetId,
      "status": "open"
    },
    "id": 1
  };

  state = 4;
  socket.send( JSON.stringify(msg) );

}

function suscribe(){
  var msg = {
  "jsonrpc": "2.0",
  "method": "subscribe",
  "params": {
    "_auth": auth,
    "session": sessionId,
    "streams": [
      
      "mot"
    ]
  },
  "id": 1
  }

  state = 5;
  socket.send( JSON.stringify(msg) );
}

function connect(){
  socket = new WebSocket("wss://emotivcortex.com:54321");

  socket.onopen = function(){
    console.log("Open!");
    getUserLogin();
  }

  socket.onmessage = function(msg){
    data = safeParse(msg.data);
    console.log(data);
    result = data.result; 

    /*try{
      focus = data.met[6];
    }catch(_){}

    console.log(focus);*/

    switch( state ){
      case 1:
        if( result[0] == "rodi1012" ){
          authorize();
        }else{
          console.log('ERROR: wrong user')
        }
        break;
      case 2:
        
        auth = result._auth;
        console.log('Authorized: ' + auth)
        queryHeadsets();
      case 3:
        try{
          headsetId = result[0].id
          console.log('Headsets: ' + headsetId)
          createSession();
        }catch(_){return null;}
      case 4:
        sessionId = result.id;
        console.log('Session created: ' + sessionId );
        suscribe();
      case 5:
        try{
          giroX = data.mot[1];
          avgGiro = (avgGiro + giroX)/2;
          giroY = data.mot[2]/100;
          
          
        }catch(_){}

    }

  }

  socket.onclose = function(){
    console.log("Close")
  }

  return socket;
}

function init(){
  socket = connect();
}

function preload ()
{
  init();  
  this.load.image('platform', 'platform.png');
  this.load.image('star', 'star.png');
  this.load.image('brick', 'brick.png');
}

var msg = "The brain is awesome"
var star;
var platform;
var bricks;
var points = 0;
var scoreText;

function create ()
{
  var smsg = msg.split(" ");

  platform = this.physics.add.sprite(100, 550, 'platform');
  star = this.physics.add.sprite(50, 100, 'star');
  bricks = this.physics.add.group({
    key: 'brick',
    repeat: smsg.length*7-1,
    gridAlign: {width: 7, height: smsg.length, cellWidth: 50, cellHeight: 50, x: 250, y: 100}
  });

  back = false;
  console.log(smsg[2][1])
  cgame = this;
  c = 0;
  w = 0;

  bricks.children.iterate( function( child ){
    child.body.immovable = true;

    if( c < smsg[w].length ){
      var style = {font: '20px Arial', fill: '#ff0000', align: 'center' }
      var text = cgame.add.text( child.x, child.y - child.height/2, smsg[w][c], style );    

    }else if( c >= 6 ){
        c = -1;
        w = w + 1;
    }
    c++;
  })

  platform.body.allowGravity = false;
  platform.body.immovable = true;
  platform.body.collideWorldBounds = true;
  star.body.collideWorldBounds = true;
  this.physics.add.collider( star, platform );
  star.body.bounce.set( 1 );
  star.body.velocity.set(SPEED,SPEED);

  //[this.physics.add.collider( bricks, star );
  this.physics.add.collider( star, bricks, collideBrick, null, this );

  var style = {font: '24px Arial' };
  scoreText = this.add.text( 10, 0, 'Score: ' + points, style );
  var style = {font: '24px Arial', fill: '#678800', stroke: '#889900', strokeTickness: 16, align: 'center'};
  endText = this.add.text( 350, 300, '', style );
} 

function collideBrick( star, brick ){
  brick.disableBody( true, true );
  points++;
}

var back;

function hideAll(){
  platform.disableBody( true, true );
  star.disableBody( true, true );
}

function lostScreen(){
  hideAll();
  endText.setText( 'Game Over' );
  gameState = LOST;
}

function winScreen(){

}

function update ()
{
  if( gameState == PLAYING ){
    scoreText.setText('Score: ' + points);
    /*giroX = Math.sin( t );
    t = t + 0.01;*/
    //star.body.velocity.set(SPEED,SPEED);

    diff = (giroX - avgGiro);
    epsilon = 50;
    dd = Math.abs(diff - epsilon)/epsilon;

    if( diff < -epsilon && back ){
      platform.setVelocityX(-200*(dd>1?dd:1));
      back = false;
    }else if( diff > epsilon && back ){
      platform.setVelocityX(200*(dd>1?dd:1));
      back = false;
    }else if( Math.abs(diff) > 2*epsilon )
      back = true;

    if( star.y > platform.y+20 ){
      console.log('Lost!');
      gameState = LOST;
    }

  }else if( gameState == LOST ){
    lostScreen();
  }else if( gameState == WIN ){
    winScreen();
  }

}
