import * as C from './cyclade/cycladecontroller.js';
import CycladeUtils from './cyclade/CycladeUtils.js';
import CycladeSettings from './cyclade/CycladeSettings.js';
import CycladeMapRoot from './cyclade/CycladeMapRoot.js';

/*MAIN CODE*/
var myBestTrackStyle = "single_best_track";
var myColorsSortingOnPointsBestTrack="ventfort";
var whatIWantToGetPrintedAsPopupAppears = "grandfrais";


let bestTrackSettings = {
    //type pour gestion des différences de noms de champs
    "type": "best_track", 
    "style": myBestTrackStyle,
    //couleur des points
    "points": myColorsSortingOnPointsBestTrack,
    "on_click": {
        "map_style": "highlight",
        "vents": whatIWantToGetPrintedAsPopupAppears
    }
};
let modelesSettings = {
    "type": "modele", 
    "style": "modele",
    "points": "modele",
    "on_click": {
        "map_style": "modele",  
        "vents": whatIWantToGetPrintedAsPopupAppears
    }
};

(function start() {
    
    //obtenir une instance de la classe CycladeUtils, qui donne un accès à des fonctions utilitaires
    let instanceCycladeUtils = new CycladeUtils();

    //envoyer toutes les données d'architecture du site et du code HTML au module
    //les élements de DOM seront transmis au module qui le gère
    C.initialiseInterface(instanceCycladeUtils.read_json('data/config/architecture.json', false));

    //envoyer les configuration des graphs et cartes à une instance de CycladeSettings, qui pourra rendre des objets "prêts à l'emploi" le moment venu
    let instanceCycladeSettings = new CycladeSettings(instanceCycladeUtils.read_json("data/config/config_charts.json", false), instanceCycladeUtils.read_json('data/config/config_map.json', false));
    
    //obtenir un "objet carte", le paramètre est le nom qu'on a donné à une carte dans config_map.json
    let mapObject = instanceCycladeSettings.getMapObject("firstMap");
    
    //installation de la carte, et du fond de carte
    let instanceCycladeMapRoot = new CycladeMapRoot(instanceCycladeUtils.read_json('data/config/geo_layers.json', false), mapObject);
    //boolean = présence ou non d'un graticule
    instanceCycladeMapRoot.implementMap(true);

    //Récupérer notre carte pour l'envoyer à toutes les instances de CycladeGraphs ou CycladeMaps qui devront travailler dessus
    let map = {}
    map["firstMap"] = instanceCycladeMapRoot.getMap();

    //on récupère un object complet "best-track" à partir de l'objet simple d'initialisation
    // celui-là est prêt à être manipulé par une instance de Cyclade Graph ou Cyclade Map
    let btSettings = instanceCycladeSettings.getCycladeObject(bestTrackSettings);
    //récupérer un objet "modèles",  prêt à être manipulé par une instance de Cyclade Graph ou Cyclade Map
    let modelsObject = instanceCycladeSettings.getCycladeObject(modelesSettings);

    //Envoyer nos objets carte et réglages à cycladecontroller pour manipulation
    C.enableBestTracksSelection(btSettings, map);
    C.enableModelSelection(modelsObject, map);

    C.enableTheGraphs(instanceCycladeSettings,map);
    //on vaut un graphique par paramètre
    C.createAGraphOnClick('param');

    //gérer l'impression des propositions de bassins/saisons/systemes dans les listes déroulantes
    C.generateCascadingLists() 

    //Imprime les champs sélectionnables pour les graphiques
    let paramsFields = instanceCycladeSettings.getAvailablesParamsFieldsNames();
    C.printParamsFieldsOptions(paramsFields);
    
    //activer le bouton "Vider la carte"
    C.activeClicOnRemoveLayers();

})();