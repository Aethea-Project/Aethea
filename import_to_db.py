import json
import os
import csv
import psycopg2

ARABIC_NAMES = {
    "Clarinase":          "كلاريناز",
    "Actifed":            "أكتيفيد",
    "Coldex":             "كولدكس",
    "Decotab":            "ديكوتاب",
    "Sinumax":            "سينوماكس",
    "Rhinopront":         "رينوبرونت",
    "Flucold":            "فلوكولد",
    "Sinutab":            "سينوتاب",
    "Panadol Cold & Flu": "بنادول كولد آند فلو",
    "Brufen 400mg":       "بروفين ٤٠٠ مجم",
    "Voltaren 50mg":      "فولتارين ٥٠ مجم",
    "Cataflam":           "كتافلام",
    "Panadol 500mg":      "بنادول ٥٠٠ مجم",
    "Panadol Extra":      "بنادول إكسترا",
    "Profinal":           "بروفينال",
    "Nurofen":            "نوروفين",
    "Aspirin":            "أسبرين",
    "Feldene":            "فيلدين",
    "Arcoxia":            "أركوكسيا",
    "Celebrex":           "سيليبريكس",
    "Augmentin 625mg":    "أوجمنتين ٦٢٥ مجم",
    "Amoxil 500mg":       "أموكسيل ٥٠٠ مجم",
    "Flagyl 500mg":       "فلاجيل ٥٠٠ مجم",
    "Ciprobay 500mg":     "سيبروباي ٥٠٠ مجم",
    "Zithromax 500mg":    "زيثروماكس ٥٠٠ مجم",
    "Ospamox":            "أوسباموكس",
    "Klacid":             "كلاسيد",
    "Cefspan":            "سيفسبان",
    "Nexium 40mg":        "نيكسيوم ٤٠ مجم",
    "Omeprazole 20mg":    "أوميبرازول ٢٠ مجم",
    "Antinal":            "أنتينال",
    "Smecta":             "سميكتا",
    "Buscopan":           "بوسكوبان",
    "Motilium":           "موتيليوم",
    "Peptazol":           "بيبتازول",
    "Gaviscon":           "جافيسكون",
    "Neurobion":          "نيوروبيون",
    "Vitamin C 500mg":    "فيتامين سي ٥٠٠ مجم",
    "Calcium Sandoz":     "كالسيوم ساندوز",
    "Zinc":               "زنك",
    "Folic Acid":         "حمض الفوليك",
    "Omega 3":            "أوميجا ٣",
}

def load_env(env_path):
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                if line.strip() and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    env_vars[key.strip()] = value.strip().strip("'\"")
    return env_vars

def main():
    print("Loading environment variables...")
    env_vars = load_env('backend/.env')
    db_url = env_vars.get('DATABASE_URL')
    
    if not db_url:
        print("DATABASE_URL not found in backend/.env")
        return

    print("Connecting to DB...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    print("Loading mapped medicines...")
    with open('egyptian_medicines_mapped.json', 'r', encoding='utf-8') as f:
        medicines = json.load(f)

    print("Loading all DrugBank drugs from CSV...")
    drugbank_rows = []
    with open('drugbank_parsed.csv', mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            db_id = row.get('drugbank_id')
            if db_id:
                categories = json.dumps([c.strip() for c in row['categories'].split('|')]) if row.get('categories') else "[]"
                synonyms = json.dumps([s.strip() for s in row.get('synonyms', '').split('|')]) if row.get('synonyms') else "[]"
                drugbank_rows.append((
                    db_id,
                    row.get('name'),
                    synonyms,
                    categories,
                    None, # contraindications
                    "[]"  # interactions
                ))

    try:
        print(f"Importing {len(drugbank_rows)} DrugBank references...")
        from psycopg2.extras import execute_values
        insert_query = """
            INSERT INTO "drugbank_drugs" (
                "drugbankId", name, synonyms, categories, contraindications, interactions, "createdAt"
            ) VALUES %s
            ON CONFLICT ("drugbankId") DO NOTHING
        """
        execute_values(cur, insert_query, [
            (row[0], row[1], row[2], row[3], row[4], row[5], 'now()') for row in drugbank_rows
        ])
        
        print(f"Importing {len(medicines)} mapped Egyptian medicines...")
        for drug in medicines:
            brand_name_en = drug['brandNameEn']
            brand_name_ar = ARABIC_NAMES.get(brand_name_en, brand_name_en)
            
            cur.execute("""
                INSERT INTO "medicines" (
                    "id", "brandNameAr", "brandNameEn", "activeIngredient", 
                    "drugbankId", "drugClasses", "category", "form", "isOtc", "createdAt"
                ) VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, now())
            """, (
                brand_name_ar,
                brand_name_en,
                drug['activeIngredient'],
                drug.get('drugbankId'),
                drug['drugClasses'],
                drug['category'],
                drug['form'],
                drug['isOtc']
            ))

        conn.commit()
        print("Import completed successfully!")
    except Exception as e:
        conn.rollback()
        print(f"Error during import: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == '__main__':
    main()