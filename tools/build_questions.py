"""Reconstruit data/questions.json en séries de 8 questions (une par thème et par série).

Usage : python3 tools/build_questions.py
Les 16 premières questions sont déjà dans data/questions.json ; les suivantes sont définies ici.
"""
import json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
Q = {q["id"]: q for q in json.load(open(root / "data/questions.json", encoding="utf-8"))}

new = [
    ("q17", "eco", 1, "Il faut poursuivre la baisse des impôts de production payés par les entreprises.", "Ces impôts s'appliquent à l'activité des entreprises, indépendamment de leurs bénéfices. La CVAE en est un exemple."),
    ("q18", "eco", 1, "Les droits de succession doivent être supprimés ou fortement réduits.", "Ils s'appliquent aux transmissions de patrimoine après un décès, avec des abattements selon le lien de parenté."),
    ("q19", "social", 1, "Une partie des pensions de retraite doit reposer sur la capitalisation.", "Le système actuel fonctionne par répartition : les cotisations des actifs financent les pensions en cours."),
    ("q20", "social", 1, "Les règles d'indemnisation du chômage doivent être durcies.", "Plusieurs réformes ont modifié ces dernières années les conditions et la durée d'indemnisation."),
    ("q21", "ecologie", 1, "L'interdiction de vendre des voitures thermiques neuves en 2035 doit être supprimée ou repoussée.", "Cette échéance a été fixée au niveau européen ; son maintien fait débat."),
    ("q22", "ecologie", 1, "Les zones à faibles émissions (ZFE) doivent être supprimées.", "Les ZFE limitent la circulation des véhicules les plus polluants dans certaines agglomérations."),
    ("q23", "europe", 1, "La France doit sortir du commandement intégré de l'OTAN.", "La France l'avait quitté en 1966 et y est revenue en 2009."),
    ("q24", "europe", -1, "La défense de la France doit être davantage organisée avec ses partenaires européens.", "Par exemple : achats d'armement communs, protection antimissile ou dissuasion nucléaire."),
    ("q25", "immigration", -1, "Les travailleurs sans papiers doivent pouvoir être régularisés.", "Aujourd'hui, la régularisation relève d'une décision du préfet, au cas par cas."),
    ("q26", "immigration", 1, "Le droit du sol doit être supprimé ou restreint.", "Un enfant né en France de parents étrangers peut acquérir la nationalité française, sous conditions notamment de résidence."),
    ("q27", "securite", 1, "L'âge de la majorité pénale doit être abaissé à 16 ans.", "Les mineurs relèvent aujourd'hui d'un régime de justice spécifique jusqu'à 18 ans, avec une atténuation de peine possible dès 13 ans."),
    ("q28", "securite", 1, "Les aménagements et réductions de peine doivent être fortement limités.", "Ils permettent d'exécuter une peine autrement qu'en détention ou d'en réduire la durée."),
    ("q29", "societe", 1, "Un service national doit être rétabli pour les jeunes.", "Le service militaire obligatoire a été suspendu en 1997 ; un service national universel volontaire a été expérimenté."),
    ("q30", "societe", 1, "La gestation pour autrui (GPA) doit rester interdite en France.", "La GPA est interdite en France ; certains pays l'autorisent."),
    ("q31", "institutions", 1, "L'article 49.3 de la Constitution doit être supprimé.", "Il permet au gouvernement de faire adopter un texte sans vote, sauf motion de censure."),
    ("q32", "institutions", 1, "Toute révision de la Constitution doit être soumise à référendum.", "Une révision peut aujourd'hui être adoptée par le Parlement réuni en Congrès, sans référendum."),
    ("q33", "eco", -1, "L'État doit nationaliser certaines entreprises stratégiques (banques, énergie, autoroutes…).", "L'État est déjà actionnaire de plusieurs grandes entreprises ; les autoroutes sont exploitées par des sociétés privées sous concession."),
    ("q34", "eco", -1, "La France et l'Union européenne doivent relever leurs droits de douane pour protéger la production locale.", "Les droits de douane sont fixés au niveau européen."),
    ("q35", "eco", 1, "L'audiovisuel public doit être privatisé.", "Il comprend notamment France Télévisions et Radio France, financés par l'État."),
    ("q36", "social", -1, "L'installation des médecins doit être régulée là où ils sont déjà nombreux.", "Les médecins libéraux choisissent aujourd'hui librement leur lieu d'installation."),
    ("q37", "social", -1, "Les obligations de logements sociaux imposées aux communes (loi SRU) doivent être maintenues ou renforcées.", "La loi SRU impose à certaines communes un taux minimal de logements sociaux, de 20 ou 25 %."),
    ("q38", "social", 1, "La durée légale du travail (35 heures) doit être allongée ou laissée à la négociation dans chaque entreprise.", "Les heures au-delà de 35 heures par semaine sont aujourd'hui des heures supplémentaires majorées."),
    ("q39", "ecologie", -1, "L'usage des pesticides doit être davantage restreint, même si cela crée des contraintes pour les agriculteurs.", "Certaines substances sont interdites en France mais autorisées dans d'autres pays européens."),
    ("q40", "ecologie", -1, "L'interdiction progressive de louer les logements les plus énergivores (passoires thermiques) doit être maintenue.", "Elle s'appuie sur le diagnostic de performance énergétique (DPE)."),
    ("q41", "ecologie", -1, "Le transport aérien doit être davantage taxé ou limité, par exemple pour les vols intérieurs.", "Le kérosène des vols commerciaux n'est pas taxé comme les carburants routiers."),
    ("q42", "europe", 1, "La France doit pouvoir s'affranchir des décisions de la Cour européenne des droits de l'homme, voire quitter cette convention.", "La CEDH relève du Conseil de l'Europe, et non de l'Union européenne."),
    ("q43", "europe", 1, "La France doit rétablir des contrôles permanents à toutes ses frontières, y compris avec ses voisins européens.", "Dans l'espace Schengen, les contrôles aux frontières intérieures ne sont en principe que temporaires."),
    ("q44", "europe", 1, "La France doit s'opposer à l'accord de libre-échange entre l'Union européenne et le Mercosur.", "Cet accord concerne l'Argentine, le Brésil, le Paraguay et l'Uruguay."),
    ("q45", "immigration", 1, "L'aide médicale d'État (AME) doit être supprimée ou limitée aux soins urgents.", "L'AME prend en charge les soins des étrangers en situation irrégulière, sous conditions de ressources et de résidence."),
    ("q46", "immigration", 1, "Il faut construire plus de centres de rétention et allonger la durée de rétention des étrangers en situation irrégulière.", "La rétention permet de garder un étranger le temps d'organiser son éloignement, pour une durée limitée par la loi."),
    ("q47", "immigration", 1, "L'accès à l'asile en France doit être nettement restreint.", "L'asile protège les personnes persécutées ; les conditions de dépôt et d'examen des demandes font débat."),
    ("q48", "securite", 1, "Les consommateurs de drogue doivent être sanctionnés plus sévèrement.", "L'usage de stupéfiants est un délit, souvent sanctionné par une amende forfaitaire."),
    ("q49", "securite", 1, "La police doit pouvoir utiliser la vidéoprotection assistée par intelligence artificielle.", "Son usage est strictement encadré ; la reconnaissance faciale en temps réel dans l'espace public n'est pas autorisée."),
    ("q50", "securite", -1, "L'usage des lanceurs de balles de défense (LBD) et des grenades par la police doit être interdit ou fortement restreint.", "Ces armes sont utilisées notamment lors des manifestations."),
    ("q51", "societe", 1, "L'école doit redevenir plus sélective : redoublement, fin du collège unique, exigence renforcée.", "Le collège unique accueille tous les élèves dans un même cursus jusqu'à la troisième."),
    ("q52", "societe", 1, "L'uniforme doit être instauré à l'école.", "Il a fait l'objet d'expérimentations dans certains établissements."),
    ("q53", "institutions", 1, "Il faut transférer davantage de compétences de l'État vers les collectivités locales.", "Communes, départements et régions exercent déjà des compétences définies par la loi."),
    ("q54", "institutions", 1, "Il faut supprimer un échelon de collectivités, par exemple en fusionnant départements et régions.", "La France compte des communes, des intercommunalités, des départements et des régions."),
    ("q55", "institutions", 1, "Le président doit être élu pour un mandat unique ou plus long, comme un septennat.", "Le président est élu pour cinq ans, renouvelable une fois."),
    ("q56", "societe", 1, "Les réseaux sociaux doivent être interdits aux moins de 15 ans.", "Une loi de 2023 a fixé une « majorité numérique » à 15 ans, mais son application reste incomplète."),
    ("q57", "eco", -1, "Les aides publiques aux entreprises doivent être conditionnées à des engagements (emploi, salaires, climat).", "Subventions, exonérations et crédits d'impôt aux entreprises représentent des dizaines de milliards d'euros par an."),
    ("q58", "eco", -1, "Il faut taxer davantage les dividendes et les superprofits des grandes entreprises.", "Pour les particuliers, les dividendes sont aujourd'hui soumis à un prélèvement forfaitaire unique (« flat tax »)."),
    ("q59", "eco", 1, "Une « règle d'or » limitant le déficit public doit être inscrite dans la Constitution.", "Les règles budgétaires européennes fixent déjà des plafonds de déficit et de dette."),
    ("q60", "social", -1, "Les loyers doivent être encadrés, voire gelés, dans les zones où le logement est cher.", "L'encadrement des loyers s'applique aujourd'hui dans certaines villes volontaires, à titre expérimental."),
    ("q61", "social", 1, "Des jours de carence doivent s'appliquer à tous les arrêts maladie, dans le privé comme dans le public.", "Les jours de carence sont des jours d'arrêt maladie non indemnisés ; leur nombre diffère entre public et privé."),
    ("q62", "social", -1, "Les dépassements d'honoraires des médecins doivent être fortement encadrés.", "Certains médecins sont autorisés à facturer au-delà du tarif de la Sécurité sociale."),
    ("q63", "ecologie", 1, "Il faut prolonger la durée de vie des réacteurs nucléaires existants.", "Les réacteurs actuels ont été conçus pour environ 40 ans ; leur prolongation est examinée par l'Autorité de sûreté nucléaire."),
    ("q64", "ecologie", 1, "L'objectif de « zéro artificialisation nette » des sols (ZAN) doit être assoupli ou supprimé.", "La loi Climat et résilience de 2021 vise à ne plus consommer, en net, d'espaces naturels d'ici 2050."),
    ("q65", "ecologie", 1, "Il faut développer les réserves d'eau pour l'irrigation agricole, y compris les « méga-bassines ».", "Ces retenues stockent de l'eau prélevée en hiver pour l'irrigation estivale ; elles sont contestées."),
    ("q66", "europe", 1, "La France doit sortir de l'euro.", "La France partage l'euro avec une vingtaine d'autres pays de l'Union européenne depuis 2002."),
    ("q67", "europe", -1, "La dissuasion nucléaire française doit aussi contribuer à protéger nos partenaires européens.", "La décision d'emploi de l'arme nucléaire relève du seul président de la République."),
    ("q68", "europe", 1, "La contribution de la France au budget de l'Union européenne doit être réduite ou conditionnée.", "La France verse au budget européen plus qu'elle n'en reçoit."),
    ("q69", "immigration", 1, "Le regroupement familial doit être suspendu ou fortement restreint.", "Il permet à un étranger installé régulièrement de faire venir sa famille, sous conditions de ressources et de logement."),
    ("q70", "immigration", 1, "Les étrangers condamnés pour des délits graves doivent être expulsés systématiquement.", "L'expulsion est aujourd'hui décidée au cas par cas, avec des protections pour certaines situations familiales."),
    ("q71", "immigration", 1, "La France doit dénoncer l'accord franco-algérien de 1968 sur l'immigration.", "Cet accord fixe des règles d'entrée et de séjour spécifiques pour les ressortissants algériens."),
    ("q72", "securite", 1, "Les mineurs doivent pouvoir être jugés en comparution immédiate.", "La justice des mineurs prévoit aujourd'hui des procédures spécifiques."),
    ("q73", "securite", -1, "Il faut rétablir une police de proximité, centrée sur la prévention et le lien avec les habitants.", "Une police de proximité avait été créée en 1998, puis abandonnée au début des années 2000."),
    ("q74", "securite", 1, "Les polices municipales doivent être renforcées et armées, voire rendues obligatoires dans les grandes communes.", "La création et l'armement d'une police municipale relèvent aujourd'hui du choix du maire."),
    ("q75", "societe", 1, "Le téléphone portable doit être interdit dans tous les établissements scolaires, jusqu'au lycée.", "Il est interdit à l'école et au collège depuis 2018 ; la règle varie au lycée."),
    ("q76", "societe", -1, "La corrida et la chasse à courre doivent être interdites.", "Elles restent autorisées, la corrida dans les régions de tradition."),
    ("q77", "societe", -1, "Le droit à l'IVG doit être encore renforcé, y compris au niveau européen.", "La liberté de recourir à l'IVG est inscrite dans la Constitution depuis 2024."),
    ("q78", "institutions", 1, "Des citoyens tirés au sort doivent participer à la décision publique.", "Des conventions citoyennes tirées au sort ont déjà été réunies, à titre consultatif."),
    ("q79", "institutions", 1, "Le vote blanc doit être reconnu comme suffrage exprimé, voire le vote rendu obligatoire.", "Les votes blancs sont comptés mais n'entrent pas dans le calcul des résultats."),
    ("q80", "institutions", 1, "Les étrangers non européens résidant en France doivent pouvoir voter aux élections locales.", "Seuls les citoyens de l'Union européenne peuvent aujourd'hui voter aux élections municipales."),
]
for i, a, s, e, c in new:
    Q.setdefault(i, {"id": i, "axe": a, "sens": s, "enonce": e, "contexte": c})

# Série 1 = une question par thème : le graphe devient lisible dès la fin de la série 1.
waves = [
    ["q01", "q03", "q05", "q07", "q09", "q11", "q14", "q16"],
    ["q02", "q04", "q06", "q08", "q10", "q12", "q13", "q15"],
    ["q17", "q19", "q21", "q23", "q25", "q27", "q29", "q31"],
    ["q18", "q20", "q22", "q24", "q26", "q28", "q30", "q32"],
    ["q33", "q36", "q39", "q44", "q45", "q48", "q51", "q53"],
    ["q34", "q37", "q40", "q43", "q46", "q49", "q56", "q54"],
    ["q35", "q38", "q41", "q42", "q47", "q50", "q52", "q55"],
    ["q57", "q60", "q63", "q66", "q69", "q72", "q75", "q78"],
    ["q58", "q61", "q64", "q67", "q70", "q73", "q76", "q79"],
    ["q59", "q62", "q65", "q68", "q71", "q74", "q77", "q80"],
]
out = []
for k, w in enumerate(waves, 1):
    for i in w:
        d = dict(Q[i]); d["serie"] = k; out.append(d)
json.dump(out, open(root / "data/questions.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out), "questions")
