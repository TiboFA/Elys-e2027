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
]
for i, a, s, e, c in new:
    Q.setdefault(i, {"id": i, "axe": a, "sens": s, "enonce": e, "contexte": c})

# Série 1 = une question par thème : le graphe devient lisible dès la fin de la série 1.
waves = [
    ["q01", "q03", "q05", "q07", "q09", "q11", "q14", "q16"],
    ["q02", "q04", "q06", "q08", "q10", "q12", "q13", "q15"],
    ["q17", "q19", "q21", "q23", "q25", "q27", "q29", "q31"],
    ["q18", "q20", "q22", "q24", "q26", "q28", "q30", "q32"],
]
out = []
for k, w in enumerate(waves, 1):
    for i in w:
        d = dict(Q[i]); d["serie"] = k; out.append(d)
json.dump(out, open(root / "data/questions.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out), "questions")
