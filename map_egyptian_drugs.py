import csv
import json
import os

# The provided list of Egyptian medicines
EGYPTIAN_DRUGS = [
    # Cold & Flu 
    { "trade_name": "Clarinase",          "active_ingredient": "Loratadine",       "drugbank_id": "DB00455", "category": "cold",       "form": "Tablet" },
    { "trade_name": "Actifed",            "active_ingredient": "Pseudoephedrine",  "drugbank_id": "DB00852", "category": "cold",       "form": "Tablet" },
    { "trade_name": "Coldex",             "active_ingredient": "Paracetamol",      "drugbank_id": "DB00316", "category": "cold",       "form": "Tablet" },
    { "trade_name": "Decotab",            "active_ingredient": "Pseudoephedrine",  "drugbank_id": "DB00852", "category": "cold",       "form": "Tablet" },
    { "trade_name": "Sinumax",            "active_ingredient": "Pseudoephedrine",  "drugbank_id": "DB00852", "category": "cold",       "form": "Tablet" },
    { "trade_name": "Rhinopront",         "active_ingredient": "Pseudoephedrine",  "drugbank_id": "DB00852", "category": "cold",       "form": "Capsule" },
    { "trade_name": "Flucold",            "active_ingredient": "Paracetamol",      "drugbank_id": "DB00316", "category": "cold",       "form": "Tablet" },
    { "trade_name": "Sinutab",            "active_ingredient": "Pseudoephedrine",  "drugbank_id": "DB00852", "category": "cold",       "form": "Tablet" },
    { "trade_name": "Panadol Cold & Flu", "active_ingredient": "Pseudoephedrine",  "drugbank_id": "DB00852", "category": "cold",       "form": "Tablet" },

    # Painkillers 
    { "trade_name": "Brufen 400mg",       "active_ingredient": "Ibuprofen",        "drugbank_id": "DB01050", "category": "painkiller", "form": "Tablet" },
    { "trade_name": "Voltaren 50mg",      "active_ingredient": "Diclofenac",       "drugbank_id": "DB00586", "category": "painkiller", "form": "Tablet" },
    { "trade_name": "Cataflam",           "active_ingredient": "Diclofenac",       "drugbank_id": "DB00586", "category": "painkiller", "form": "Tablet" },
    { "trade_name": "Panadol 500mg",      "active_ingredient": "Acetaminophen",    "drugbank_id": "DB00316", "category": "painkiller", "form": "Tablet" },
    { "trade_name": "Panadol Extra",      "active_ingredient": "Acetaminophen",    "drugbank_id": "DB00316", "category": "painkiller", "form": "Tablet" },
    { "trade_name": "Profinal",           "active_ingredient": "Ibuprofen",        "drugbank_id": "DB01050", "category": "painkiller", "form": "Tablet" },
    { "trade_name": "Nurofen",            "active_ingredient": "Ibuprofen",        "drugbank_id": "DB01050", "category": "painkiller", "form": "Tablet" },
    { "trade_name": "Aspirin",            "active_ingredient": "Aspirin",          "drugbank_id": "DB00945", "category": "painkiller", "form": "Tablet" },
    { "trade_name": "Feldene",            "active_ingredient": "Piroxicam",        "drugbank_id": "DB00554", "category": "painkiller", "form": "Capsule" },
    { "trade_name": "Arcoxia",            "active_ingredient": "Etoricoxib",       "drugbank_id": "DB01628", "category": "painkiller", "form": "Tablet" },
    { "trade_name": "Celebrex",           "active_ingredient": "Celecoxib",        "drugbank_id": "DB00482", "category": "painkiller", "form": "Capsule" },

    # Antibiotics 
    { "trade_name": "Augmentin 625mg",    "active_ingredient": "Amoxicillin",      "drugbank_id": "DB01060", "category": "antibiotic", "form": "Tablet" },
    { "trade_name": "Amoxil 500mg",       "active_ingredient": "Amoxicillin",      "drugbank_id": "DB01060", "category": "antibiotic", "form": "Capsule" },
    { "trade_name": "Flagyl 500mg",       "active_ingredient": "Metronidazole",    "drugbank_id": "DB00916", "category": "antibiotic", "form": "Tablet" },
    { "trade_name": "Ciprobay 500mg",     "active_ingredient": "Ciprofloxacin",    "drugbank_id": "DB00537", "category": "antibiotic", "form": "Tablet" },
    { "trade_name": "Zithromax 500mg",    "active_ingredient": "Azithromycin",     "drugbank_id": "DB00207", "category": "antibiotic", "form": "Tablet" },
    { "trade_name": "Ospamox",            "active_ingredient": "Amoxicillin",      "drugbank_id": "DB01060", "category": "antibiotic", "form": "Tablet" },
    { "trade_name": "Klacid",             "active_ingredient": "Clarithromycin",   "drugbank_id": "DB01211", "category": "antibiotic", "form": "Tablet" },
    { "trade_name": "Cefspan",            "active_ingredient": "Cefixime",         "drugbank_id": "DB00671", "category": "antibiotic", "form": "Capsule" },

    # Stomach 
    { "trade_name": "Nexium 40mg",        "active_ingredient": "Esomeprazole",     "drugbank_id": "DB00736", "category": "stomach",    "form": "Tablet" },
    { "trade_name": "Omeprazole 20mg",    "active_ingredient": "Omeprazole",       "drugbank_id": "DB00338", "category": "stomach",    "form": "Capsule" },
    { "trade_name": "Antinal",            "active_ingredient": "Nifuroxazide",     "drugbank_id": "DB08326", "category": "stomach",    "form": "Capsule" },
    { "trade_name": "Smecta",             "active_ingredient": "Diosmectite",      "drugbank_id": None,      "category": "stomach",    "form": "Powder" },
    { "trade_name": "Buscopan",           "active_ingredient": "Butylscopolamine", "drugbank_id": "DB00725", "category": "stomach",    "form": "Tablet" },
    { "trade_name": "Motilium",           "active_ingredient": "Domperidone",      "drugbank_id": "DB01184", "category": "stomach",    "form": "Tablet" },
    { "trade_name": "Peptazol",           "active_ingredient": "Omeprazole",       "drugbank_id": "DB00338", "category": "stomach",    "form": "Tablet" },
    { "trade_name": "Gaviscon",           "active_ingredient": "Alginic acid",     "drugbank_id": "DB14439", "category": "stomach",    "form": "Tablet" },

    # Vitamins 
    { "trade_name": "Neurobion",          "active_ingredient": "Cyanocobalamin",   "drugbank_id": "DB00115", "category": "vitamin",    "form": "Tablet" },
    { "trade_name": "Vitamin C 500mg",    "active_ingredient": "Ascorbic acid",    "drugbank_id": "DB00126", "category": "vitamin",    "form": "Tablet" },
    { "trade_name": "Calcium Sandoz",     "active_ingredient": "Calcium carbonate","drugbank_id": "DB06724", "category": "vitamin",    "form": "Tablet" },
    { "trade_name": "Zinc",               "active_ingredient": "Zinc",             "drugbank_id": "DB01593", "category": "vitamin",    "form": "Tablet" },
    { "trade_name": "Folic Acid",         "active_ingredient": "Folic acid",       "drugbank_id": "DB00158", "category": "vitamin",    "form": "Tablet" },
    { "trade_name": "Omega 3",            "active_ingredient": "Omega-3",          "drugbank_id": "DB11133", "category": "vitamin",    "form": "Capsule" },
]

csv_file_path = 'drugbank_parsed.csv'
output_json_path = 'egyptian_medicines_mapped.json'

def load_drugbank_data(filepath):
    print("Loading DrugBank CSV...")
    db_dict = {}
    if not os.path.exists(filepath):
        print(f"Error: {filepath} not found!")
        return db_dict
        
    with open(filepath, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            db_id = row.get('drugbank_id')
            if db_id:
                categories = []
                if row.get('categories'):
                    categories = [c.strip() for c in row['categories'].split('|')]
                
                db_dict[db_id] = {
                    "name": row.get('name'),
                    "categories": categories,
                    "synonyms": [s.strip() for s in row.get('synonyms', '').split('|')] if row.get('synonyms') else []
                }
    print(f"Loaded {len(db_dict)} references from DrugBank CSV.")
    return db_dict

def main():
    drugbank_data = load_drugbank_data(csv_file_path)
    
    mapped_medicines = []
    
    for drug in EGYPTIAN_DRUGS:
        db_id = drug['drugbank_id']
        drug_categories = []
        
        if db_id and db_id in drugbank_data:
            drug_categories = drugbank_data[db_id]['categories']
        
        mapped_medicine = {
            "brandNameEn": drug['trade_name'],
            "brandNameAr": drug['trade_name'], # Placeholder - needs translation later if required
            "activeIngredient": drug['active_ingredient'],
            "drugbankId": db_id,
            "drugClasses": drug_categories,
            "category": drug['category'],
            "form": drug['form'],
            "isOtc": True
        }
        
        mapped_medicines.append(mapped_medicine)
        print(f"Mapped: {drug['trade_name']} -> {len(drug_categories)} categories found.")
        
    with open(output_json_path, 'w', encoding='utf-8') as f:
        json.dump(mapped_medicines, f, indent=2, ensure_ascii=False)
        
    print(f"\nSuccess! Mapped {len(mapped_medicines)} drugs and saved to {output_json_path}")

if __name__ == '__main__':
    main()
