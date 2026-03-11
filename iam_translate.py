#!/usr/bin/env python3
import jwt, time, json, requests

KEY_ID = "69a25a83632d37000102e2de"
KEY_SECRET = "f713d9ab03d8faed95692e4d59bc6755952803800956bdc01ffea067cf7c83e3"
BASE = "http://localhost:3007"
CONTENT_KEY = "b8903092a7c9a8b54d7378f5a1"

def get_token():
    key = bytes.fromhex(KEY_SECRET)
    return jwt.encode({"iat": int(time.time()), "exp": int(time.time())+300, "aud": "/admin/"},
                       key, algorithm="HS256", headers={"alg":"HS256","typ":"JWT","kid":KEY_ID})

def admin_headers():
    return {"Authorization": f"Ghost {get_token()}", "Content-Type": "application/json"}

def make_lexical(html):
    return json.dumps({"root":{"children":[{"type":"html","version":1,"html":html}],"direction":None,"format":"","indent":0,"type":"root","version":1}})

CTA = 'Curious what IAM can do for your location? <a href="https://iam.zenithcred.com/contact">Contact us for a free consultation.</a>'

# Tag translations
TAG_MAP = {
    "Producten": "Products", "Entertainment": "Entertainment", "Technologie": "Technology",
    "Revalidatie": "Rehabilitation", "Gezondheidszorg": "Healthcare",
    "Ouders": "Parents", "Buitenspelen": "Outdoor Play", "Onderwijs": "Education",
    "Kinderopvang": "Childcare", "Bewegend Leren": "Active Learning"
}

# English translations for all 8 posts
TRANSLATIONS = {
    "interactieve-vloer-kinderdagverblijf": {
        "title": "Interactive Floor for Daycare: Everything You Need to Know",
        "slug": "interactieve-vloer-kinderdagverblijf-en",
        "excerpt": "Considering an interactive floor for your daycare? Discover how this technology stimulates active play, learning, and development in young children.",
        "html": """<p>An interactive floor transforms any room into an engaging play and learning environment. Children run, jump, and play on projected games that respond to their movements — combining physical activity with cognitive development.</p>
<h2>What is an interactive floor?</h2>
<p>A projector mounted on the ceiling displays interactive games on the floor. Motion sensors detect children's movements, making the projections respond in real time. Step on a butterfly and it flies away. Jump in a puddle and watch the water splash.</p>
<h2>Benefits for daycare centres</h2>
<ul><li><strong>Active play</strong> — Children move constantly while playing</li><li><strong>Motor skills development</strong> — Running, jumping, balancing, and coordination</li><li><strong>Cognitive development</strong> — Colours, numbers, shapes, and patterns</li><li><strong>Social interaction</strong> — Designed for group play</li><li><strong>Inclusive</strong> — Accessible for children with different abilities</li></ul>
<h2>Practical considerations</h2>
<ul><li><strong>Space</strong> — A minimum of 3×4 metres is recommended</li><li><strong>Lighting</strong> — The room should be partially darkened</li><li><strong>Safety</strong> — Soft flooring underneath for safe play</li><li><strong>Maintenance</strong> — Minimal: keep the lens clean, software updates are automatic</li></ul>
<h2>Educational value</h2>
<p>An <a href="https://iam.zenithcred.com/products/interactieve-vloer.html">interactive floor</a> isn't just fun — it supports early childhood development goals. Educators can select games aligned with learning objectives, from letter recognition to counting exercises.</p>
<p>""" + CTA + "</p>"
    },
    "interactieve-speeltoestellen-kinderopvang": {
        "title": "Interactive Play Equipment for Childcare: A Complete Guide",
        "slug": "interactieve-speeltoestellen-kinderopvang-en",
        "excerpt": "Looking for interactive play equipment for your childcare facility? Explore the options, benefits, and what to consider before investing.",
        "html": """<p>Interactive play equipment is revolutionising childcare facilities across Europe. From interactive floors to climbing walls, these systems combine physical play with digital engagement — keeping children active, challenged, and entertained.</p>
<h2>Types of interactive play equipment</h2>
<ul><li><strong><a href="https://iam.zenithcred.com/products/interactieve-vloer.html">Interactive floors</a></strong> — Projected games that respond to movement</li><li><strong><a href="https://iam.zenithcred.com/products/interactieve-muur.html">Interactive walls</a></strong> — Touch-reactive projections on any wall</li><li><strong><a href="https://iam.zenithcred.com/products/interactieve-zandbak.html">Interactive sandboxes</a></strong> — Augmented reality meets sandbox play</li><li><strong><a href="https://iam.zenithcred.com/products/interactieve-klimwand.html">Interactive climbing walls</a></strong> — Gamified climbing challenges</li><li><strong><a href="https://iam.zenithcred.com/products/mobiele-vloer.html">Mobile systems</a></strong> — Portable interactive floors for flexible use</li></ul>
<h2>Why invest in interactive play?</h2>
<ul><li><strong>Differentiation</strong> — Stand out from other childcare providers</li><li><strong>Development</strong> — Supports motor, cognitive, and social skills</li><li><strong>Engagement</strong> — Children stay actively involved longer</li><li><strong>Fresh content</strong> — Regular software updates with new games</li></ul>
<h2>What to consider</h2>
<p>Think about available space, age groups, and budget. Most systems are scalable — start with one solution and expand over time. Installation is typically completed within a day.</p>
<p>""" + CTA + "</p>"
    },
    "bewegend-leren-peuters-kleuters": {
        "title": "Active Learning for Toddlers and Preschoolers: Why Movement Matters",
        "slug": "bewegend-leren-peuters-kleuters-en",
        "excerpt": "Active learning combines physical movement with education. Discover why this approach is so effective for toddlers and preschoolers.",
        "html": """<p>Young children learn best when they move. Active learning — combining physical movement with educational content — is one of the most effective approaches for toddlers and preschoolers. Research consistently shows that movement enhances concentration, memory, and cognitive development.</p>
<h2>What is active learning?</h2>
<p>Active learning means children physically engage with educational content rather than sitting still. They jump on numbers, run to colours, dance to letters. The body becomes a learning tool.</p>
<h2>The science behind it</h2>
<ul><li><strong>Brain development</strong> — Movement stimulates neural connections</li><li><strong>Memory</strong> — Physical experiences are remembered better</li><li><strong>Concentration</strong> — Children focus longer after movement breaks</li><li><strong>Motivation</strong> — Play-based learning feels like fun, not work</li></ul>
<h2>How interactive technology supports active learning</h2>
<p>An <a href="https://iam.zenithcred.com/products/interactieve-vloer.html">interactive floor</a> is the perfect tool for active learning. It projects educational games that require children to move: jumping on the right answer, running to sort colours, or balancing to guide a character through a maze.</p>
<h2>Practical tips for implementation</h2>
<ul><li><strong>Start small</strong> — Even 10 minutes of active learning makes a difference</li><li><strong>Integrate</strong> — Link movement activities to your existing curriculum</li><li><strong>Vary</strong> — Alternate between calm and active moments</li><li><strong>Observe</strong> — Watch how children respond and adjust accordingly</li></ul>
<p>""" + CTA + "</p>"
    },
    "interactieve-muur-school": {
        "title": "The Interactive Wall at School: Technology That Transforms the Classroom",
        "slug": "interactieve-muur-school-en",
        "excerpt": "An interactive wall takes learning beyond the smartboard. Discover how schools use this technology to create engaging, movement-based education.",
        "html": """<p>The classroom is evolving. Where chalkboards made way for smartboards, we now see the next step: interactive walls that transform the entire classroom into a learning environment.</p>
<h2>What is an interactive wall?</h2>
<p>An interactive wall projects images onto a surface that respond to touch and movement. Children can draw directly on the wall, play educational games, and learn interactively. The difference from a smartboard? The projection can be much larger, and multiple children interact simultaneously.</p>
<h2>Applications in education</h2>
<ul><li><strong>Language learning</strong> — Interactive word games and letter puzzles</li><li><strong>Mathematics</strong> — Mathematical concepts become tangible</li><li><strong>Geography and history</strong> — Interactive maps and timelines</li><li><strong>Creative subjects</strong> — Digital drawing on a large scale</li><li><strong>Social skills</strong> — Collaborative games</li></ul>
<h2>Benefits for education</h2>
<ul><li><strong>Differentiation</strong> — The level adjusts automatically</li><li><strong>Engagement</strong> — Disengaged children become actively involved</li><li><strong>Movement</strong> — Students stand and move, improving concentration</li></ul>
<h2>Implementation at school</h2>
<p>Installing an <a href="https://iam.zenithcred.com/products/interactieve-muur.html">interactive wall</a> is simpler than expected. A projector is mounted, and the system is ready to use immediately. Many schools start with one system and expand later.</p>
<p>""" + CTA + "</p>"
    },
    "interactieve-projectie-speeltuin": {
        "title": "Interactive Projection in Playgrounds: The Future of Outdoor Play",
        "slug": "interactieve-projectie-speeltuin-en",
        "excerpt": "Interactive projection brings playgrounds to life. Discover how digital technology transforms outdoor play areas and keeps children moving longer.",
        "html": """<p>The playground of the future is a place where digital projections and physical play come together. Interactive projection technology is transforming playgrounds, theme parks, and Family Entertainment Centres worldwide.</p>
<h2>How does it work?</h2>
<p>Projectors display interactive images on floors, walls, or play equipment. Sensors detect children's movements, causing the game to respond to running, jumping, and touching.</p>
<h2>Applications</h2>
<ul><li><strong>Interactive play floors</strong> — Large surfaces where dozens of children play simultaneously</li><li><strong>Interactive slides</strong> — Projections that respond to speed</li><li><strong>Interactive sandboxes</strong> — <a href="https://iam.zenithcred.com/products/interactieve-zandbak.html">Digital projections on sand</a></li><li><strong>Interactive walls</strong> — <a href="https://iam.zenithcred.com/products/interactieve-muur.html">Outdoor walls as touchscreens</a></li><li><strong>Themed experiences</strong> — Seasonal content</li></ul>
<h2>Why invest?</h2>
<ul><li><strong>Higher visitor numbers</strong> — The wow factor attracts visitors</li><li><strong>Longer dwell time</strong> — A varied experience keeps families longer</li><li><strong>Repeat visits</strong> — Refreshed content brings people back</li><li><strong>Competitive edge</strong> — Unique in the market</li></ul>
<p>""" + CTA + "</p>"
    },
    "digitale-speeltuin-kinderen": {
        "title": "The Digital Playground: Why Children Love It (And Parents Do Too)",
        "slug": "digitale-speeltuin-kinderen-en",
        "excerpt": "A digital playground combines physical play with smart technology. Discover why both children and parents are enthusiastic about this new way of playing.",
        "html": """<p>The term "digital playground" raises concern with some parents. More screen time? No — quite the opposite. A modern digital playground combines technology with physically active play, without a tablet or smartphone in sight.</p>
<h2>What is a digital playground?</h2>
<p>A physical space where interactive technology enhances the play experience. Floors that light up, walls you paint with your whole body, sandboxes where digital animals appear. The technology is invisible — children only see the game.</p>
<h2>Why children think it's amazing</h2>
<ul><li><strong>Magic</strong> — The floor responds to you!</li><li><strong>Variety</strong> — Every visit is different</li><li><strong>Teamwork</strong> — Designed for group play</li><li><strong>Challenge</strong> — Adapts to skill level</li></ul>
<h2>Why parents appreciate it</h2>
<ul><li><strong>Active, not passive</strong> — Children move the entire time</li><li><strong>Educational</strong> — Learning elements without feeling like school</li><li><strong>Social</strong> — Playing together, not behind a screen</li><li><strong>Safe</strong> — No sharp edges or hygiene risks</li></ul>
<h2>Types of interactive play solutions</h2>
<ul><li><a href="https://iam.zenithcred.com/products/interactieve-vloer.html">Interactive floors</a></li><li><a href="https://iam.zenithcred.com/products/interactieve-muur.html">Interactive walls</a></li><li><a href="https://iam.zenithcred.com/products/interactieve-zandbak.html">Interactive sandboxes</a></li><li><a href="https://iam.zenithcred.com/products/interactieve-klimwand.html">Interactive climbing walls</a></li><li><a href="https://iam.zenithcred.com/products/mobiele-vloer.html">Mobile systems</a></li></ul>
<p>""" + CTA + "</p>"
    },
    "revalidatie-kinderen-interactief": {
        "title": "Interactive Technology in Paediatric Rehabilitation: Play as Therapy",
        "slug": "revalidatie-kinderen-interactief-en",
        "excerpt": "Interactive technology makes paediatric rehabilitation more engaging and effective. Discover how interactive floors and walls are used in rehabilitation care.",
        "html": """<p>In paediatric rehabilitation, motivation is everything. Interactive technology changes the rules: therapy becomes play, and children practise longer and more intensively without it feeling like work.</p>
<h2>The challenge of traditional paediatric rehabilitation</h2>
<p>Motivating a child to repeat the same exercise dozens of times is a daily challenge. Even the best toys lose their appeal after a few sessions.</p>
<h2>How interactive technology helps</h2>
<ul><li><strong>Intrinsic motivation</strong> — The game itself is the reward</li><li><strong>Repetition without boredom</strong> — The same exercise in dozens of game variants</li><li><strong>Adjustable difficulty</strong> — Adapts to the child's abilities</li><li><strong>Measurable progress</strong> — Records movements and reaction times</li><li><strong>Group therapy</strong> — Multiple children practise together</li></ul>
<h2>Applications</h2>
<ul><li><strong>Motor rehabilitation</strong> — Gross and fine motor skills through interactive games</li><li><strong>Balance and coordination training</strong> — Weight shifting and balancing</li><li><strong>Cognitive rehabilitation</strong> — Memory and attention games with movement</li><li><strong>Pain management</strong> — Distraction reduces the experience of pain</li></ul>
<h2>InterActiveMove in healthcare</h2>
<p>Our <a href="https://iam.zenithcred.com/products/interactieve-vloer.html">interactive floors</a> and <a href="https://iam.zenithcred.com/products/interactieve-muur.html">walls</a> are used for rehabilitation, education, and entertainment — maximising the return on investment.</p>
<p>""" + CTA + "</p>"
    },
    "interactieve-zandbak-kopen": {
        "title": "Buying an Interactive Sandbox: What You Need to Know",
        "slug": "interactieve-zandbak-kopen-en",
        "excerpt": "Considering buying an interactive sandbox? Read everything about how it works, the possibilities, costs, and what to look for when making your choice.",
        "html": """<p>An interactive sandbox combines the age-old joy of sand play with advanced projection technology. But what does it cost, how does it work, and is it right for your location?</p>
<h2>How does an interactive sandbox work?</h2>
<p>Above the sandbox hangs a projector with a depth sensor. The system continuously scans the sand surface and projects interactive images. Dig a hole and water appears. Build a mountain and grass grows. The projection adapts in real time.</p>
<h2>Play possibilities</h2>
<ul><li><strong>Topography</strong> — Learning about landscapes and water flows</li><li><strong>Ecology</strong> — Animals appear in the right habitat</li><li><strong>Seasons</strong> — The landscape changes with the seasons</li><li><strong>Free play</strong> — Create your own world</li><li><strong>Educational</strong> — Guided assignments</li></ul>
<h2>Who is it suitable for?</h2>
<ul><li><strong>Daycare centres</strong> — Indoor alternative to the outdoor sandbox</li><li><strong>Schools</strong> — Geography in a tangible way</li><li><strong>Museums</strong> — Educational exhibitions</li><li><strong>Indoor playgrounds</strong> — A unique attraction</li><li><strong>Rehabilitation centres</strong> — Tactile stimulation with visual feedback</li></ul>
<h2>What does an interactive sandbox cost?</h2>
<p>A standard system starts around €5,000–€8,000 including projector, sensor, and software. Larger systems up to €15,000. Lease models are available.</p>
<h2>Installation and maintenance</h2>
<p>The projector and sensor are mounted above the sandbox. Maintenance is limited to keeping the lens clean and topping up the sand. Software updates are automatic.</p>
<p>Curious whether an <a href="https://iam.zenithcred.com/products/interactieve-zandbak.html">interactive sandbox</a> is right for your location? """ + CTA + "</p>"
    }
}

# Fetch all posts
resp = requests.get(f"{BASE}/ghost/api/content/posts/?key={CONTENT_KEY}&limit=all&include=tags&formats=html")
posts = resp.json()["posts"]

results = []

for post in posts:
    slug = post["slug"]
    trans = TRANSLATIONS[slug]
    
    # Get English tags
    en_tags = [{"name": "#en"}]
    for tag in post["tags"]:
        en_name = TAG_MAP.get(tag["name"], tag["name"])
        en_tags.append({"name": en_name})
    
    # Create English post
    payload = {
        "posts": [{
            "title": trans["title"],
            "slug": trans["slug"],
            "lexical": make_lexical(trans["html"]),
            "status": "published",
            "published_at": post["published_at"],
            "custom_excerpt": trans["excerpt"],
            "tags": en_tags
        }]
    }
    
    r = requests.post(f"{BASE}/ghost/api/admin/posts/", json=payload, headers=admin_headers())
    if r.status_code == 201:
        created = r.json()["posts"][0]
        results.append(f"✅ Created: {created['title']} → /{created['slug']}/")
    else:
        results.append(f"❌ Failed {trans['slug']}: {r.status_code} {r.text[:200]}")
    
    # Update Dutch post with #nl tag
    nl_tags = [{"name": "#nl"}] + [{"name": t["name"]} for t in post["tags"]]
    
    # Need to get updated_at for the update
    get_r = requests.get(f"{BASE}/ghost/api/admin/posts/{post['id']}/", headers=admin_headers())
    if get_r.status_code == 200:
        current = get_r.json()["posts"][0]
        update_payload = {
            "posts": [{
                "tags": nl_tags,
                "updated_at": current["updated_at"]
            }]
        }
        u = requests.put(f"{BASE}/ghost/api/admin/posts/{post['id']}/", json=update_payload, headers=admin_headers())
        if u.status_code == 200:
            results.append(f"  🏷️ Tagged Dutch post '{post['slug']}' with #nl")
        else:
            results.append(f"  ❌ Failed tagging {post['slug']}: {u.status_code} {u.text[:200]}")

print("\n".join(results))
