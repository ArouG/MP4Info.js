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
	
	for multiple or single file and no worker : index.html

#Try it ? 
    http://aroug.eu/MP4Info/   (multiple + worker)       

#Bugs :
    This version use await/async so Microsoft Internet is forbiden ... but Edge run :-)
    More : workers (multiple files) work now in kind of parallelism (not one after one)
