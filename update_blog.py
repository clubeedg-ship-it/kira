import json
import os
from datetime import datetime

# Path to the blog data file
file_path = '/home/adminuser/projects/iam/staging/js/blog-local-data.js'

# The new blog post to add
new_post = {
    "id": 6001,
    "title_nl": "Waarom Kinderdagverblijven Kiezen voor Interactief Leren",
    "title_en": "Why Kindergartens Choose Interactive Learning",
    "slug": "waarom-kinderdagverblijven-kiezen-voor-interactief-leren",
    "feature_image": "media/blog/kindergarten-interactive-learning.png",
    "excerpt_nl": "Ontdek hoe interactieve vloeren de fysieke activiteit en leerprestaties in de kinderopvang verhogen. Al vanaf €199 per maand.",
    "excerpt_en": "Discover how interactive floors increase physical activity and learning performance in childcare. Starting from €199 per month.",
    "published_at": datetime.utcnow().isoformat() + "Z",
    "tags": [
        {
            "name_nl": "Strategie",
            "name_en": "Strategy"
        },
        {
            "name_nl": "Kinderopvang",
            "name_en": "Kindergarten"
        }
    ],
    "html_nl": """
<h2>Laat kinderen leren door te bewegen</h2>
<p>In een wereld waar schermtijd toeneemt, biedt IAM een oplossing die beweging en educatie combineert. Onze interactieve vloer is speciaal ontwikkeld voor kinderdagverblijven die meer willen bieden dan alleen opvang.</p>

<h3>De 3 Belangrijkste Voordelen</h3>
<ul>
    <li><strong>35 minuten extra beweging:</strong> Kinderen bewegen onbewust meer terwijl ze spelen.</li>
    <li><strong>Hogere retentie:</strong> Kinderen onthouden 90% van wat ze doen, vergeleken met 10% van wat ze alleen horen.</li>
    <li><strong>Tijdswinst voor team:</strong> Geen voorbereiding nodig; kies een spel en start direct.</li>
</ul>

<h3>Nu Beschikbaar: Flexibele Lease</h3>
<p>Wij maken innovatie betaalbaar. Met ons lease-model start u al vanaf <strong>€199 per maand</strong>, inclusief hardware, installatie en een groeiende spelbibliotheek.</p>

<p>Benieuwd naar de mogelijkheden? <a href=\"/contact.html\">Boek een gratis demo op locatie</a>.</p>
""",
    "html_en": """
<h2>Let children learn by moving</h2>
<p>In a world where screen time is increasing, IAM offers a solution that combines movement and education. Our interactive floor is specifically developed for kindergartens that want to offer more than just childcare.</p>

<h3>The 3 Key Benefits</h3>
<ul>
    <li><strong>35 minutes extra movement:</strong> Children unconsciously move more while they play.</li>
    <li><strong>Higher retention:</strong> Children remember 90% of what they do, compared to 10% of what they only hear.</li>
    <li><strong>Time savings for staff:</strong> No preparation needed; choose a game and start immediately.</li>
</ul>

<h3>Now Available: Flexible Lease</h3>
<p>We make innovation affordable. With our lease model, you can start from <strong>€199 per month</strong>, including hardware, installation, and a growing game library.</p>

<p>Interested in the possibilities? <a href=\"/contact.html\">Book a free on-site demo</a>.</p>
"""
}

try:
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Extract the JSON array from the JS file
    json_str = content.split('const BLOG_LOCAL_DATA = ')[1].strip().rstrip(';')
    data = json.loads(json_str)
    
    # Check if slug already exists to avoid duplicates
    if not any(post['slug'] == new_post['slug'] for post in data):
        data.insert(0, new_post) # Add to the top
        
        # Write back to the file
        new_content = f"const BLOG_LOCAL_DATA = {json.dumps(data, indent=2)};"
        with open(file_path, 'w') as f:
            f.write(new_content)
        print("Blog updated successfully.")
    else:
        print("Blog post already exists.")
except Exception as e:
    print(f"Error: {str(e)}")
