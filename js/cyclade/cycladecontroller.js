import CycladeInterface from './CycladeInterface.js';
import CycladeUtils from './CycladeUtils.js';
import CycladeMaps from './CycladeMaps.js';
import CycladeGraphRoot from './CycladeGraphRoot.js';


/*METHODES DE COMMUNICATION ENTRE INTERFACE ET DONNEES*/

let myinterface = {
    "def": "interface, ids, access to the data for now",
    "content": null
};
let instancesCMBestTracks = {
    "def": "all instances of CycladeMaps for best-tracks",
    "content": {}
};
let instancesModels = {
    "def": "all instances of CycladeMaps for previsions",
    "content": {}
};

let instancesCycladeGraphRoot = {
    "def": "Instances of CycladeGraphRoot",
    "content": []
};

let settingsObjects = {
    "def": "objects recieved to instanciate CycladeMaps",
    "content": {}
};

let utils = new CycladeUtils();
let ci = {};


/*********************  INITIALISATION ********************* /
/*** Paramétrages ***/
//une instance de CycladeInterface serivra à gérer tout le DOM de la page
export function initialiseInterface(archiSettings) {
    myinterface.content = archiSettings;
    ci = new CycladeInterface(myinterface.content.selectors);
}
/**
 * Enregistre un objet "carte" sous son id si inexistant, et renvoie son id
 * @param {object} oneMap tableau associatif nom => objet carte
 */
function registerMap(oneMap) {
    for (const [key, value] of Object.entries(oneMap)) {
        if (typeof (settingsObjects.content[key]) == 'undefined') {
            settingsObjects.content[key] = value;
        }
        return key;
    }
}

/**
 * Enregistrer les paramétrages pour les futures instanciations de CycladMaps ou CycladeGraphs
 * @param {string} name 
 * @param {object} object 
 * @param {object} map 
 */
function registerSettingsObjects(name, object, map = null) {
    settingsObjects.content[name] = object;
    let mymap = registerMap(map);
    if (map) {
        settingsObjects.content[name]["map"] = mymap;
    }
}
/**
 * Ces deux fonctions servent à récupérer et enregistrer les objets avec lesquels on instanciera CycladeMaps le moment venu
 * On parle ici d'objets déjà préparés par CycladeSettings
 * @param {object} btObject 
 * @param {object} map 
 */
export function enableBestTracksSelection(btObject, map) {
    registerSettingsObjects("bt", btObject, map);
}

export function enableModelSelection(modelsSettings, map) {
    registerSettingsObjects("model", modelsSettings, map);
}

/*** Intanciations ***/

/**
 * Crée une instance de CycladeGraphRoot pour chaque div de graph prévue et renseignée dans architecture.json
 * @param {object} instanceParams 
 */
export function enableTheGraphs(instanceParams, map) {
    for (let i = 0; i < myinterface.content.chartsIds.length; i++) {
        let mymap = registerMap(map);
        let instanceGraphRootCyclade = new CycladeGraphRoot(instanceParams.getChartRootParams(), myinterface.content.chartsIds[i], settingsObjects.content[mymap]);
        instancesCycladeGraphRoot.content.push(instanceGraphRootCyclade);
    }
}

/**
 * !!DOC VIGILANCE
 * Pour un id de Modèle donné, vérifier si ses données font déjà l'objet d'une instance de CycladeMaps
 * Sinon, récupérer les données 
 * Valeur de l'input suit de schéma "modele.bassin.reference.traqueur" pour l'instant
 * @param {string} modelName value of the input
 */
function handleModelsInstances(modelName) {
    //besoin du nom du bassin + saison pour accéder au fichier
    let bassin = ci.getBassin();
    let saison = ci.getSaison();
    let traj = ci.getTraj();
    //Chercher si une instance de CycladeMaps existe déjà pour un Modèle de ce système
    //Sinon, créer une nouvelle entrée dans instanceModels pour contenir les instances pour ce système
    if (typeof (instancesModels.content[traj]) == 'undefined') {
        instancesModels.content[traj] = {};
    }

    // Cas aucune instance de CycladeMaps trouvé pour ce Modèle
    if (typeof (instancesModels.content[traj][modelName]) == 'undefined') {
        //créer une nouvelle entrée dans instanceModels de cette saison pour contenir mon instance CycladeMaps

        //retrouver le bon fichier dans  myinterface.content.modeles_files (=architecture.json)
        let emplacement = myinterface.content.modeles_files[bassin][saison][traj];
        let i = 0
        // PARTIE DOUTEUSE
        while (i < emplacement.length) {
            //compare les valeurs des id des checkboxes des traqueurs aux noms de fichiers disponibles
            let exp = new RegExp(modelName);
            //exp.test == true si nom de fichier trouvé
            if (exp.test(emplacement[i])) {
                //importer les données du fichier dans une variable
                var data = utils.read_json(myinterface.content.modeles_directory + emplacement[i], false);
                //FIN PARTIE DOUTEUSE
                //créer une instance de CycladeMaps pour manipuler les données
                instancesModels.content[traj][modelName] = new CycladeMaps(settingsObjects.content["model"], data, settingsObjects.content[settingsObjects.content["model"]["map"]]);
                break;
            }
            i += 1;
        }
    }
}
/*********************  MANIPULATION DE L'INTERFACE ********************* /
 
/******** REMOVE ********/
/**
 * Enlève des données de l'interface en fonction de la navigation
 * @param {number} statenumber 
 */
function eraseFromInterface(statenumber) {
    //Changement de graph ou de trajectoire
    if (statenumber > 0) {
        clearAllGraphsAndRemoveWindFromMap();
    }

    //traj select
    if (statenumber > 1) {
        //enlever les choix de modèles-traqueurs
        //le second paramètre est bidon il faut juste l'envoyer pour bien enlever les modèles, cf CycladeInterface
        ci.removeListOfFeaturesToCheck("modeles", "bassinsaisontraj");
        ci.eraseSelectedDates();
    }
    //Saison Select
    if (statenumber > 2) {
        //enlever les infos sur les dates du précédent cyclone
        ci.removeDatesMessage();
        //enelever les options des trajs précédents dans le select
        ci.removeOptionsUnderASelect("trajectoireselectid");
        //nettoyer la carte
        removeLayersFromMap();
    }
    //Bassin select
    if (statenumber > 3) {
        //enlever les saisons du select
        ci.removeOptionsUnderASelect("saisonselectid");
    }
}
/**
 * Clic sur le bouton "vider la carte" : vide la carte, les graphiques, enlève les dates sélectionnées, replace la liste de système sur "Choisir"
 */
export function activeClicOnRemoveLayers() {
    let btnremoveLayers = document.getElementById(myinterface.content.selectors.emptymapid);
    btnremoveLayers.addEventListener("click", () => {
        eraseFromInterface(2);
        //enlever les infos sur les dates du précédent cyclone
        ci.removeDatesMessage();
        //vider la carte
        removeLayersFromMap();
        //repositionner "systèmes" sur choisir sans enlever toutes les options
        ci.resetOptionsForASelect("","trajectoireselectid"); 
    });
}
/**
 * Enlever toutes les trajectoires de prévisions pour une date donnée
 * @param {string} date 
 */
function removeModelsTrajsForADate(date) {
    for (let item in instancesModels.content) {
        for (let myitem in instancesModels.content[item]) {
            instancesModels.content[item][myitem].removeALayer(date);
        }
    }
}

/**
 * Enlever tout les impressions des instances CycladeMaps sur une ou des cartes
 */
function removeLayersFromMap() {
    removeLayersForAGroupOfInstances(instancesCMBestTracks.content);
    removeLayersForAGroupOfInstances(instancesModels.content);
}
/**
 * Vide la carte pour un groupe d'instances
 * @param {object} group 
 */
function removeLayersForAGroupOfInstances(group) {
    for (let item in group) {
        for (let myitem in group[item]) {
            group[item][myitem].removeAllLayers();
        }
    }
}

/**
 * Dé-publie le contenu généré par chaque instance de CycladeGraphRoot
 */
function clearAllGraphsAndRemoveWindFromMap() {
    if (instancesCycladeGraphRoot.content.length > 0) {
        for (let i = 0; i < instancesCycladeGraphRoot.content.length; i++) {
            instancesCycladeGraphRoot.content[i].removeWindFromMap(instancesCycladeGraphRoot.content[i]);
            instancesCycladeGraphRoot.content[i].clearGraph();
        }
    }
}

/******** PRINT ON CONTROLS PANEL ********/

/**
 * imprime la liste des bassins pour les best track, définis avec interface.json, et déclenche la possibilité d'imprimer la liste des saisons, puis celle des systèmes...
 */
export function generateCascadingLists() {
    for (let bassin in myinterface.content.best_track_files) {
        ci.createOptionForASelect(bassin, bassin, "bassinselectid");
    }
    let select = document.getElementById(myinterface.content.selectors.bassinselectid);
    select.onchange = function (event) {
        eraseFromInterface(4);
        generateSeasonsList();
    }
}
/**
 * Interface : génère la liste des saisons disponible pour un bassin
 * Interne : crée et enregistre une instance CycladeMaps avec le paramétrage "best-track" pour chaque saison
 */
function generateSeasonsList() {
    let bassin = ci.getBassin();
    //Cas où les instances n'ont pas déjà été crées
    if (instancesCMBestTracks.content[bassin] == null) {
        instancesCMBestTracks.content[bassin] = {};
        for (let i = 0; i < myinterface.content.best_track_files[bassin].length; i++) {
            //récupérer les données
            var data = utils.read_json(myinterface.content.best_track_directory + myinterface.content.best_track_files[bassin][i], false);
            //on enregistre toutes les instances dans un objet, avec une valeur associée (bassin + no saison ici);
            instancesCMBestTracks.content[bassin][data.saison] = new CycladeMaps(settingsObjects.content["bt"], data, settingsObjects.content[settingsObjects.content["bt"]["map"]]);
        }
    }
    //création d'une option dans le select de l'interface pour chaque instance
    for (let season in instancesCMBestTracks.content[bassin]) {
        ci.createOptionForASelect(season, season, "saisonselectid");
    }
    let select = document.getElementById(myinterface.content.selectors.saisonselectid);
    select.onchange = function () {
        generateTrajectoriesList();
    }
}
/**
 * Retrouve l'instance CycladeMaps associée à la saison sélectionnée sur l'interface
 * Propose une option cliquable pour chaque trajectoire qu'elle contient 
 */

function generateTrajectoriesList() {
    //gestion visuelle de l'interface
    eraseFromInterface(3);

    // récupérer le bassin et la saison
    let bassin = ci.getBassin();
    let saison = ci.getSaison();

    //fonction de la classe CycladeGraphs pour récupérer les "fields" de l'instance sélectionnée (champs choisis dans architecture.json), qui vont s'afficher dans les options
    let options = instancesCMBestTracks.content[bassin][saison].getTrajectoriesChoice(myinterface.content.identifiantsTrajs.fields, myinterface.content.identifiantsTrajs.idField);
    //créer une option supplémentaire pour "toutes les trajectoires"
    let all = {
        text: "All trajectories",
        value: myinterface.content.identifiantsTrajs.valueForAll
    }
    options.push(all);

    //créer une option dans le select pour chacune des trajectoires possibles
    for (let i = options.length - 1; i > -1; i--) {
        ci.createOptionForASelect(options[i].text, options[i].value, "trajectoireselectid");
    }
    //activer le clic sur une traj
    enableTrajectoriesSelection(instancesCMBestTracks.content[bassin][saison]);
}

//!DOC VIGILANCE
/**
 * Trouve et lit un fichier de métadonnées avec la liste des couples modèles-traqueurs disponibles pour une trajectoire
 * Imprimer cette liste et la rendre cliquable sur l'interface (modèles + dates) pour impression sur carte 
 */
function printModelsOptions() {

    eraseFromInterface(2);
    //récupérer les valeurs de bassin, saison, système sélectionnées sur l'interface
    let bassin = ci.getBassin();
    let saison = ci.getSaison();
    let traj = ci.getTraj();
    let idTraqueur = (bassin + saison + traj);

    //vérifier si cette liste n'existe pas déjà
    if (!ci.checkIfListOfInputsExists("modeles", idTraqueur)) {
        //PARTIE DOUTEUSE 1
        //simulation de requête pour trouver le fichier qui contient les métadonnées sur les Models
        if (myinterface.content.modeles_meta_files[bassin]) {
            if (myinterface.content.modeles_meta_files[bassin][saison]) {
                if (myinterface.content.modeles_meta_files[bassin][saison][traj]) {
                    //chargement du fichier de métadonnées
                    let metaModelsOptions = utils.read_json((myinterface.content.meta_directory + myinterface.content.modeles_meta_files[bassin][saison][traj]), false);
                    //FIN DE PARTIE DOUTEUSE 1
                    /****TRAQUEURS ****/
                    for (let m = 0; m < metaModelsOptions.modeles.length; m++) {
                        let modelName = metaModelsOptions.modeles[m]["modele"];
                        //créer un élement de DOM pour chacun des traqueurs et l'enregistrer via cycladeinterface
                        let traqueurs = {};
                        for (let i = 0; i < metaModelsOptions.modeles[m]["traqueurs"].length; i++) {
                            //récupérer le nom du traqueur
                            let traqueurName = metaModelsOptions.modeles[m]["traqueurs"][i]["traqueur"];
                            //sur l'interface, chaque traqueur est présenté avec son modèle
                            let mtname = modelName + " - " + traqueurName;
                            //!!!!ATTENTION VALUE DOUTEUSE PEUT ETRE PLUS VALABLE QUAND URL
                            let mtvalue = modelName + "." + metaModelsOptions.bassin + "." + metaModelsOptions.reference + "." + traqueurName;
                            traqueurs[mtvalue] = mtname;
                        }
                        //cyclade interface génère le DOM de la liste, "modeles" fait références aux identifiants de DOM à utiliser spécifiés dans architecture.json
                        let domChecks = ci.publishListOfFeaturesToCheck(traqueurs, "modeles", idTraqueur);

                        /****DATES CLIQUABLES DES TRAQUEURS ****/
                        for (let i = 0; i < metaModelsOptions.modeles[m]["traqueurs"].length; i++) {
                            let dates = metaModelsOptions.modeles[m]["traqueurs"][i]["dates_reseau"];
                            generateCliquableDatesElements(dates, domChecks, i);
                        };
                    }
                } else {
                    console.log("pas de modèle pour ce trajet");
                }
            } else {
                console.log("Pas de Modèles pour cette saison");
            }
        } else {
            console.log("pas de Modèles pour ce bassin");
        }
    } else {
        //cas où la liste a déjà été publiée
        ci.rePublishListOfFeaturesToCheck("modeles", idTraqueur);
    }
    printModelTrajOnModelChange();
}

/**
 * Gestion des dates sélectionnées sur l'interface
 * @param {array} dates 
 * @param {array} domChecks 
 * @param {number} i
 */
function generateCliquableDatesElements(dates, domChecks, i) {

    const treatmentToExecuteOnClose = function (date) {
        removeModelsTrajsForADate(date);
    };
    const treatmentToExecuteOnClick = function (param) {
        printAllCheckedModelsTrajsForADate(param);
    };
    let popupdates = ci.createDatesClickablesButtonsList(domChecks[i], "clickableDates", dates, treatmentToExecuteOnClick, treatmentToExecuteOnClose);

    domChecks[i].onmouseover = function () {
        popupdates.classList.remove("elementCache");
    };
    domChecks[i].onmouseleave = function () {
        (popupdates.classList.add("elementCache"));
    }
}
/**
 * Imprime les diagnostics cliquables
 * @param {object} paramsFields 
 */
export function printParamsFieldsOptions(paramsFields) {
    ci.publishListOfFeaturesToCheck(paramsFields, "params");
}

/********PRINT ON MAP ********/
/**
 * Réagir au clic sur un système (adaptation de l'interface, impression sur la cartes, publication d'informations)
 * @param {object} monInstance 
 */
function enableTrajectoriesSelection(monInstance) {
    document.getElementById(myinterface.content.selectors.trajectoireselectid).onchange = function (event) {
        //gestion du DOM
        eraseFromInterface(1);
        printModelsOptions();
        //afficher toutes les analyses d'une saison
        if (event.target.value == myinterface.content.identifiantsTrajs.valueForAll) {
            console.log("allTrajectories");
            monInstance.printAllTrajectories();
        } else {
            monInstance.getTheRightFilePrinted(event.target.value);
            //Imprimer les dates de début/fin du système selon la best-track
            ci.changeDatesMessage(monInstance.getTheDates(event.target.value));
        }
    }
}
/**
 * Détecter un changement type check/uncheck d'un Modèle
 * Cas checked : on récupère toutes les dates déjà sélectionnées pour imprimer ses prévisions pour toutes ces dates
 * Cas uncheck : on supprime toutes les infos imprimées pour ce modèle
 */
function printModelTrajOnModelChange() {
    let bassinSaisonTraj = ci.getBassinSaisonTraj();
    //récupérer les checkboxes concernées
    let modelsInputs = ci.getInputsFromAListOfFeatures("modeles", (bassinSaisonTraj));
    let traj = ci.getTraj();
    if (typeof (modelsInputs) !== 'undefined') {
        for (let i = 0; i < modelsInputs.length; i++) {
            modelsInputs[i].onchange = function (event) {
                //si check, instanciation de CycladeMaps si besoin
                if (modelsInputs[i].checked) {
                    handleModelsInstances(event.target.value);
                    let dates = ci.getSelectedDates();
                    if (dates) {
                        for (let j = 0; j < dates.length; j++) {
                            instancesModels.content[traj][modelsInputs[i].value].getTheRightFilePrinted(dates[j]);
                        }
                    }
                } else if (!modelsInputs[i].checked) {
                    instancesModels.content[traj][modelsInputs[i].value].removeAllLayers();
                }
            }
        }
    }
}

/**
 * Imprime une trajectoire sur la carte pour chaque modele selectionné pour une date donnée
 */
function printAllCheckedModelsTrajsForADate(date) {
    //récupérer le bassin; la saison et le système choisi en interface
    let bassin = ci.getBassin();
    let saison = ci.getSaison();
    let traj = ci.getTraj();

    //vérifier que la date est valide
    if (date.length == 19) {
        //retrouver les noms des Modèles souhaités
        let models = ci.getCheckedFromListOfFeatures("modeles", (bassin + saison + traj));
        //en déduire les instances de Modèles, voir si ils ont une prev à cette date pour cette traj et si oui, la faire imprimer
        for (let i in models) {
            instancesModels.content[traj][models[i]].getTheRightFilePrinted(date);
        }
    }
}


/******** PRINT CHARTS ********/
/**
 * Active l'impression des graphiques au clic. 2 conditions prévues: "param"(1 graph par diagnostic) ou "traj" (1 graph/trajectoire)
 * Demandes les informations aux instances de CycladeGraphs, les formate pour les instances de CycladeGraphRoot qui gèrent l'impression
 * Une instance de CycladeInterface doit préparer le DOM selon le nombre de graphiques à afficher
 * @param {string} condition "traj" ou "param"
 */
export function createAGraphOnClick(condition) {
    document.getElementById(myinterface.content.selectors.submitid).addEventListener("click", () => {
        //enlever les graphiques déjà publiés
        eraseFromInterface(1);

        let bassin = ci.getBassin();
        let saison = ci.getSaison();
        let traj = ci.getTraj();
        let dates = ci.getSelectedDates();
        let param = ci.getCheckedFromListOfFeatures("params");

        //au moins un champ sélectionné
        if (param.length !== 0) {
            let models = [];
            let checkedmodels = ci.getCheckedFromListOfFeatures("modeles", (bassin + saison + traj));
            if (checkedmodels) {
                models = checkedmodels;
            }

            //trajs va contenir toutes les datas de nos trajectoires sélectionnées
            var trajs = [];

            //Best-Track
            //on récupère au moins les données de la Best-Track, dans tous les cas
            let instanceBT = instancesCMBestTracks.content[bassin][saison];
            var oneBestTrackData = prepareBtDataForGraph(instanceBT, param, traj);
            trajs.push(oneBestTrackData);

            //Modeles
            //on récupère les données des Modèles pour chaque date sélectionnée
            for (let i = 0; i < models.length; i++) {
                for (let j = 0; j < dates.length; j++) {
                    let idModele = models[i];
                    let instanceModel = instancesModels.content[traj][idModele];
                    var oneModelData = prepareModelDataForGraph(instanceModel, param, dates[j], condition);
                    if (oneModelData) {
                        trajs.push(oneModelData);
                    }
                }
            }
            //un graph par trajectoire
            if (condition == 'traj') {
                let number = countHowManyCharts(models.length + 1);
                ci.adaptInterfaceForCharts(number);
                for (let i = 0; i < number; i++) {
                    instancesCycladeGraphRoot.content[i].createAGraph(param, [trajs[i]]);
                }
            }
            //un graph par paramètre
            if (condition == 'param') {
                let number = countHowManyCharts(param.length);
                ci.adaptInterfaceForCharts(number);
                for (let i = 0; i < number; i++) {
                    if (typeof (instancesCycladeGraphRoot.content[i]) !== 'undefined') {
                        instancesCycladeGraphRoot.content[i].createAGraph([param[i]], trajs);
                    }
                }
            }
        }
    });
}

/**
 * Défini le nombre de graphiques à afficher pour qu'il ne dépasse pas le nombre d'instances de CycladeGraphRoot disponibles
 * @param {number} askedNumber 
 */
function countHowManyCharts(askedNumber) {
    if (askedNumber <= instancesCycladeGraphRoot.content.length) {
        var number = askedNumber;
    } else {
        console.log("Seulement " + instancesCycladeGraphRoot.content.length + " graphiques (instances de CycladeGraphRoot) sont prévus au maximum ");
        var number = instancesCycladeGraphRoot.content.length;
    }
    return number;
}
/******************* MANIPULATE DATAS FROM INSTANCES ******************** /

/**
 * prépare, pour une instance de CycladeMaps concernant une analyse, un objet de données prêt à être interprété par une instance de CycladeGraphRoot
 * @param {object} instance 
 * @param {array} param 
 * @param {number} traj 
 * @returns {object}
 */
function prepareBtDataForGraph(instance, param, traj) {
    let datas = instance.getGraphData(param, traj);
    let color = instance.getMainColor();
    let dashArray = instance.getMainStyle();

    let oneBestTrackData = {
        "name": instance.data.content.reference,
        "color": color,
        "dashArray": dashArray,
        "datas": datas
    };

    //je récupère les popup et les vents que si c'est un best-track, et que si ils existent
    let linksMap = instance.getMapObjects(traj);
    if (linksMap.popup) {
        oneBestTrackData["popup"] = linksMap.popup;
    }
    if (linksMap.wind) {
        oneBestTrackData["wind"] = linksMap.wind;
    };
    return oneBestTrackData;
}

/**
 * prépare, pour une instance de CycladeMaps concernant un Modèle, un objet de données prêt à être interprété par une instance de CycladeGraphRoot
 * @param {object} instance 
 * @param {array} param 
 * @param {string} date 
 * @param {string} condition 
 * @returns {object}
 */
function prepareModelDataForGraph(instance, param, date, condition) {
    let datas = instance.getGraphData(param, date);

    if (datas) {
        let name = "";
        //réduire la taille de légendes en cas de grand nombre de données à afficher
        if (param.length > 3 && condition == 'param') {
            name = instance.data.content.traqueur + " " + dayjs(date).format("MM/DD");
        } else {
            name = instance.data.content.modele + " " + instance.data.content.traqueur + " " + dayjs(date).format("MM/DD");
        }
        let dashArray = instance.getMainStyle();
        let color = instance.getMainColor();
        let oneModelData = {
            "name": name,
            "color": color,
            "dashArray": dashArray,
            "datas": datas
        };
        return oneModelData;
    } else {
        return datas;
    }
}