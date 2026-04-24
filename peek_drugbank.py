# peek_drugbank.py
path = r"G:\1.College\Graduation Project\Project Code\Versions\v7\Aethea\full database.xml"

with open(path, 'r', encoding='utf-8') as f:
    lines = []
    for i, line in enumerate(f):
        lines.append(line)
        if i > 300:
            break

with open('drugbank_peek.txt', 'w', encoding='utf-8') as out:
    out.writelines(lines)

print("Done — open drugbank_peek.txt")