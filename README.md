#MP4Info 

   Sort of "Mediainfo" for MP4 Files - little MP4Parser (just for main technics information about the file)

#Dependances : null

#Usage :

    <script src="MP4Info.js" type="text/javascript" charset="utf-8"></script> 
    (in single file .html)

    importScripts('MP4Info.js');                                              
    (in worker)


#How use it :

     
            mp4(this.files[0], function(err, info) {
                if (err) {
                    .....
                } else {
                    sortie_texte = human_reading(info);
                    ....
                }
            }); 

  MP4Info return an object structured (named 'info') wich contains a lot of technicals information about the file.
  If we want to read this informations, we need to make them readable. So human_reading is here !

#Examples :
	
	for a single file and no worker : index.html
	for multiple files and worker   : indexw.html

#Try it ? 
    http://aroug.eu/MP4Info/   (multiple + worker)       

#Bugs :
    FileReader() isn't supported by Firefox in WebWorkers :( but is OK with Opera, Chrome and IE
    Date() isn't supported by IE (NaN NaN and so on)    
