var GridSize= 16;  //Matrix Size
var GridHeight=0.9; //height in percent of window height 0-1
var GridLineWidth=2; 
var GridLineColor='#000000';
var GridStandardColor='#ffffff';
var MaxPictures=55;  //Max Capacity (dependend on arduino storage)
var Pictures=[]; //Array which stores the pictures / 4d
var PicDelay=100; //Standard delay
var Brightness=175;

var canvas;  //Var for Canvas
var gif=null;  //gif Objekt
var upload=false;   //Var for Upload; True if uploaded
var ArduinoCode=""; // var for the finished Code 


function setup() {   //setup
    $(".LoaderBackground").hide();   //disables loader at start
    canvas=createCanvas(16 , 16);   //creates canvas for small gif preview
    canvas.parent("GifObject");   //adds canvas to the gif preview div
    gif=p5Gif.loadGif("demo.gif", function(){   //loads demo gif  library--> https://github.com/WenheLI/p5.gif/wiki/gif
        this.loop();    //starts demo gif
    });
    background('#000000');  //sets canvas background
}

function draw() {  //loop
    if(!gif.isLoading && upload==true){    //waits until an upload is started and the gif finished loading
        upload=false; //resets upload status
        $(".LoaderBackground").hide(); //disables loading screen
        GifArrayToMatrix(gif.frames, gif.height, gif.width);  //starts convertaion from gif to matrix array
    }
    //updateVars();

}

function StartConversation(){   //is triggered when "Hochladen" button pressed
    var Link=$('#LinkArea').val();   //gets Value of the Link area
    if(Number($('#Brightness').val())<=255){
        Brightness=$('#Brightness').val();  //gets Value of the Brightnessarea area
    }   
    if(Link==""){   //Checks if there is a Link
        console.log("No Link");   //Errpr: No Link
        return false;
    }else{
        if(Link.indexOf(".gif")==-1){   //Checks if Link is a gif
            console.log("Link muss eine .gif Datei sein");
            return false;
        }else{
            Pictures=[]; //Resets Picture array
            Convert(Link);  //Starts conversion
        }
    }
}

function Convert(datapath){   //datapath should be a link/ starts converstion from this link
    var proxyurl = "https://cors-anywhere.herokuapp.com/"; //proxy url to pass CORS policy
    gif.pause();  //pause gif replay
    gif=p5Gif.loadGif(proxyurl+datapath,function(){  //Loads gif from Link
        this.loop();  
    });
    console.log(gif);  //Logs gif
    $(".LoaderBackground").show();  //Starts Loading screen
    upload=true;  //sets upload to true --> conncersion in will be started in Draw() loop when upload finished
}

function GifArrayToMatrix(GifFrames, h, l){  //Accepts an array of frames,/height&width of gif
    if(h==l){  //Checks if Gif is rectangel
        gif.height=16;
        gif.width=16;
        var d=h/GridSize;  //calculates pixel distance per dot
        InitializePictureArray(GifFrames.length);  //initalizes Picture Array as 4d array with the length of the gif pictures
        for(var i=0; i<GifFrames.length; i++){  //loops threw every picture of the array
            for(var y=0; y<GridSize; y++){  //loops threw every row
                for(var x=0; x<GridSize; x++){ //loops threw every column
                    var c=GifFrames[i].get(d/2+x*d,d/2+y*d); //gets pixelcoller in the center of every pixel of the gif image
                    Pictures[i][x][y][0]=floor(red(c)/10)*10;  //sets the colors to the array
                    Pictures[i][x][y][1]=floor(green(c)/10)*10;
                    Pictures[i][x][y][2]=floor(blue(c)/10)*10;
                }   
            }
        }
        CreateCode();  //Starts to create code
    }else{
        console.log("Gif Höhe muss gleich wie Breite sein");
    }
}

function InitializePictureArray(n){  //Creates a 4d array
    for(var l=0; l<n; l++){
        Pictures[l]=[];
        for(var i=0; i<GridSize; i++){
            Pictures[l][i]=[];
            for(var j=0; j<GridSize; j++){
                Pictures[l][i][j]=[];
                for(var c=0; c<4; c++){  //Creates vour element for the Predefined Picture Color
                    Pictures[l][i][j][c]=0;  //sets every color to black
                }
            }
        }
    }
}

function CreateCode(){  //Creates code
    if(Pictures.length==0){  //if there are no pictures it stops
        return false;
    }
    var FinalCode="";  //var for the Code
    var CodeStart="#include <Adafruit_NeoPixel.h>#include <avr/pgmspace.h> \r\n const int Hohe = 16; const int Breite = 16; const bool invert = true; const bool rightstart = true; const int Display = 6;";  //C++ starting Code
    var CodeSetup="#define NUMPIXELS Hohe*Breite \r\n Adafruit_NeoPixel Matrix(NUMPIXELS, Display, NEO_GRB + NEO_KHZ800); void setup() {Matrix.begin(); Matrix.setBrightness("+Brightness+");} void loop() {";  //C++ Setup Code
    var CodeEnd='} int ColorConvert(int i, int nc) { return pgm_read_byte(&PredefinedColors[i][nc]); } int MatrixConvert(int x, int y) { int nummer = 0; if (x <= Breite && x > 0 && y <= Hohe && y > 0) { if (invert) { if (rightstart) { if (x % 2 != 0) { nummer = 16 * (x - 1) + y; } else { nummer = 16 * x - y + 1; } } else { if (y % 2 == 0) { nummer = 16 * (x - 1) + y; } else { nummer = 16 * x - y + 1; } } } else { nummer = 16 * (y - 1) + x; } } else { Error("Der Wert darf nicht höher als die max Höhe und Breite sein"); } return nummer - 1; } void Error(String Code) { Serial.println(Code); }'; //C++ End Code
    var PictureC="{";  //Picture var =PredefinedColors
    var PictureCCache=[];  //var that stores the Color values in an array, Only used for searching of existing colors
    for(var i=0; i<Pictures.length; i++){
        for(var x=0; x<16; x++){
            for(var y=0; y<16; y++){
                //var TestColor="{"+Pictures[i][x][y][0].toString()+","+Pictures[i][x][y][1].toString()+","+Pictures[i][x][y][2].toString()+"}";
                // var index=PictureC.indexOf(TestColor);
                var r=Pictures[i][x][y][0];    //Sets r/g/b valus
                var g=Pictures[i][x][y][1];
                var b=Pictures[i][x][y][2];
                var index=isItemInArray(PictureCCache,[r,g,b]);  //gets index of current color in color array, if its a new color the function returns -1
                if(index==-1){  //if new color
                    PictureC=PictureC.concat(",{");  //add new c++ array with the color values
                    PictureC=PictureC.concat(r.toString());
                    PictureC=PictureC.concat(",");
                    PictureC=PictureC.concat(g.toString());
                    PictureC=PictureC.concat(",");
                    PictureC=PictureC.concat(b.toString());
                    PictureC=PictureC.concat("}");
                    PictureCCache.push([r,g,b]);  //add colors to color cache
                    Pictures[i][x][y][3]=PictureCCache.length;   //set color id to current index
                }else{
                    Pictures[i][x][y][3]=index; //set color id to the found index
                }
            }
        }
    }
    Pictures[0][0][0][3]=0;  //The PictureCodeLength is the first time 1 but needs to be 0 because its the firs color stored
    PictureC=PictureC.concat("}");
    PictureC = PictureC.slice(0, 1) + PictureC.slice(2);  //Remove first comma of array
    var temp = "This is a string.";
    var count = (temp.match(/{/g) || []).length;
    console.log(count);
    var PicColIni="\r\n const PROGMEM byte PredefinedColors["+(PictureC.match(/{/g) || []).length.toString()+"][3]=";
    console.log(PictureC);
    PicColIni+=PictureC;
    PicColIni+=";\r\n";

    FinalCode+=CodeStart;  //Ads Codestart to the final code
    FinalCode+=PicColIni;
    for(var i=0;i<Pictures.length;i++){  //loops threw every picture
        FinalCode+=GetArduinoArray(i);   //ads the arduino arrays to the final code
    }
    FinalCode+=CodeSetup;  //Ads Code setuop to the array
    for(var i=0; i<Pictures.length;i++){  //loops threw every Picture
        var gdelay=100; //sets standard delay 
        if(gif.delay[i]>0){  //if a delay from the gif is available then take this one
            gdelay=gif.delay[i];
        }
        FinalCode+="for (int i = 0; i <= Breite; i++) { for (int j = 0; j <= Hohe; j++) { Matrix.setPixelColor(MatrixConvert(i+1, j+1), Matrix.Color(ColorConvert(pgm_read_byte(&Pic"+i.toString()+"[i][j][0]), 0),ColorConvert(pgm_read_byte(&Pic"+i.toString()+"[i][j][0]), 1),ColorConvert(pgm_read_byte(&Pic"+i.toString()+"[i][j][0]), 2))); } } Matrix.show(); delay("+gdelay+");\r\n";   //Creates final code with the Picture ids and the delays
    }
    FinalCode+=CodeEnd; //ads Code end 
    ArduinoCode=FinalCode; //Sets Final Code to the gloabal Code var
}

function isItemInArray(array, item) {   //Checks if array is in 2d array
    for (var i = 0; i < array.length; i++) {
        if (array[i][0] == item[0] && array[i][1] == item[1]&& array[i][2] == item[2]) {
            return i;   // Found it
        }
    }
    return -1;   // Not found
}

function CopyCode(){  //Copys Code to Clipboars 
    navigator.clipboard.writeText(ArduinoCode).then(function() {  
        console.log('Async: Copying to clipboard was successful!');  
        $(".Copyconf").show(); //if Copy successful than show message
        setTimeout(hidecopyconf,2000);  //hide message after 2 sec
    }, function(err) {
        console.error('Async: Could not copy text: ', err);   //log error if something went wrong
    });
}

function hidecopyconf(){    //gets triggerd after 2 second -- Hides Copy confirmation
    $(".Copyconf").hide();
}

function DownloadCode(){  //Downloads Code
    download("Gif2Matrix.ino",ArduinoCode);
}

function download(filename, text) {
    var element = document.createElement('a'); //Creates Html Element 
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));  //sets atributes to the div with data url
    element.setAttribute('download', filename);  //set filename

    element.style.display = 'none'; //hides element 
    document.body.appendChild(element);

    element.click();  //clicks element to start download

    document.body.removeChild(element);  //removes element
}

function GetArduinoArray(n){ //Returns for every picture an String containing a C++ formatted byte Array with the picture data 
    var Array="const PROGMEM byte Pic"+n.toString()+"[16][16][1]={";  //creates string with array setup
    for(var x=GridSize-1; x>=0; x--){ //loops threw every x cordinate
        Array=Array.concat("{"); 
        for(var y=0; y<GridSize; y++){ //loops threw every y cordinate
            Array=Array.concat("{");
            Array=Array.concat(Pictures[n][x][y][3].toString()); //Gets Picture Color and writes it to the string
            if(y!=15){  //tests if it is the last cordinate, if true than it doesnt set an ,
                Array=Array.concat("},");  
            }else{
                Array=Array.concat("}");
            }
        }
        if(x!=0){ //tests if it is the last cordinate, if true than it doesnt set an ,
            Array=Array.concat("},");
        }else{
            Array=Array.concat("}");
        }
    }
    Array=Array.concat("}; \r\n"); //Closes Array
    return Array;  //returns Array 
}