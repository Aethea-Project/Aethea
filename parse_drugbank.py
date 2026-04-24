# parse_drugbank.py
import xml.etree.ElementTree as ET
import csv
import os

XML_PATH = r"G:\1.College\Graduation Project\Project Code\Versions\v7\Aethea\full database.xml"
OUTPUT_PATH = "drugbank_parsed.csv"

# Namespace — required for DrugBank XML
NS = "http://www.drugbank.ca"

def tag(name):
    return f"{{{NS}}}{name}"

print("Loading XML... (this may take 1-2 minutes for large file)")
tree = ET.parse(XML_PATH)
root = tree.getroot()
print("XML loaded. Parsing drugs...")

drugs = []
count = 0

for drug in root.findall(tag("drug")):
    count += 1
    if count % 1000 == 0:
        print(f"  Processed {count} drugs...")

    # Basic info
    drugbank_id = None
    for did in drug.findall(tag("drugbank-id")):
        if did.get("primary") == "true":
            drugbank_id = did.text
            break

    name_el = drug.find(tag("name"))
    name = name_el.text if name_el is not None else ""

    indication_el = drug.find(tag("indication"))
    indication = (indication_el.text or "")[:300] if indication_el is not None else ""

    # Categories / drug classes
    categories = []
    cats_el = drug.find(tag("categories"))
    if cats_el is not None:
        for cat in cats_el.findall(tag("category")):
            cat_name = cat.find(tag("category"))
            if cat_name is not None and cat_name.text:
                categories.append(cat_name.text)

    # Groups (approved, withdrawn, etc.)
    groups = []
    groups_el = drug.find(tag("groups"))
    if groups_el is not None:
        for g in groups_el.findall(tag("group")):
            if g.text:
                groups.append(g.text)

    # Brand names from products
    brand_names = []
    products_el = drug.find(tag("products"))
    if products_el is not None:
        for product in products_el.findall(tag("product")):
            pname = product.find(tag("name"))
            if pname is not None and pname.text:
                brand_names.append(pname.text)
    # Deduplicate
    brand_names = list(set(brand_names))

    # Synonyms
    synonyms = []
    synonyms_el = drug.find(tag("synonyms"))
    if synonyms_el is not None:
        for syn in synonyms_el.findall(tag("synonym")):
            if syn.text:
                synonyms.append(syn.text)

    drugs.append({
        "drugbank_id":    drugbank_id,
        "name":           name,
        "categories":     " | ".join(categories),
        "groups":         " | ".join(groups),
        "brand_names":    " | ".join(brand_names[:5]),  # max 5 brands
        "synonyms":       " | ".join(synonyms[:5]),     # max 5 synonyms
        "indication":     indication,
    })

print(f"\nTotal drugs parsed: {len(drugs)}")
print(f"Writing to {OUTPUT_PATH}...")

with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "drugbank_id", "name", "categories",
        "groups", "brand_names", "synonyms", "indication"
    ])
    writer.writeheader()
    writer.writerows(drugs)

print(f"Done. Open {OUTPUT_PATH} to see results.")