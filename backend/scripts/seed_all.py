"""
Master seed script — seeds all real CM Enterprises data.
264 areas, 476 customers, 10 routes, 4 users.

Run from backend/ folder:
    python3 -m scripts.seed_all

Safe to re-run — skips existing records.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app.shared.models
from app.core.database import SessionLocal
from app.modules.areas.model import Route, Area, RouteType
from app.modules.users.model import User, UserRole
from app.core.security import hash_password

DEFAULT_PASSWORD = "cme@1234"

ROUTES = [
    (1,  "outstation"),
    (2,  "outstation"),
    (3,  "outstation"),
    (4,  "outstation"),
    (5,  "local"),
    (6,  "local"),
    (7,  "local"),
    (8,  "local"),
    (9,  "local"),   # vacant — no sales executive yet
    (10, "local"),
]

USERS = [
    ("Anas",    "admin@cmenterprises.com",   "8722226811", "admin"),
    ("Shambhu", "shambhu@cmenterprises.com", "9000000001", "sales_executive"),
    ("Khayum",  "khayum@cmenterprises.com",  "9000000002", "delivery_executive"),
    ("Bakhar",  "bakhar@cmenterprises.com",  "9000000003", "admin"),
]

AREAS = [
    # (area_id, route_number, area_name)
    #new line
    (1, 1, 'MADHUGIRI'),
    (2, 1, 'KORATAGERE'),
    (3, 1, 'URDIGERE'),
    (4, 1, 'TUMKUR'),
    (5, 1, 'SIRA'),
    (6, 1, 'Dobaspete'),
    (7, 1, 'Kortegre'),
    (8, 2, 'HOSUR'),
    (9, 2, 'DENKANIKOTTA'),
    (10, 2, 'ATTIBELE'),
    (11, 2, 'DENKANIKOTTAL'),
    (12, 3, 'SKP'),
    (13, 3, 'BALLUPET'),
    (14, 3, 'CRP'),
    (15, 3, 'SB.GOLA'),
    (16, 3, 'SAKLESHPUR'),
    (17, 3, 'CKM'),
    (18, 3, 'HIRISAVE'),
    (19, 3, 'NUGGEHALLI'),
    (20, 3, 'KUNIGAL'),
    (21, 3, 'HASSAN'),
    (22, 3, 'BELUR'),
    (23, 3, 'BELLUR'),
    (24, 3, 'HASSAN RING RD'),
    (25, 4, 'MYSORE'),
    (26, 4, 'KOLLEGAL'),
    (27, 4, 'CHAMRAJNAGAR'),
    (28, 4, 'GUNDLUPET'),
    (29, 4, 'TARAKNABI'),
    (30, 4, 'MADDUR'),
    (31, 4, 'KUDERU'),
    (32, 4, 'TNP'),
    (33, 4, 'MALAVALLI'),
    (34, 4, 'BEGUR'),
    (35, 4, 'YELANDUR'),
    (36, 4, 'LINK ROAD TNP'),
    (37, 4, 'NGD'),
    (38, 4, 'TALAKAD'),
    (39, 5, 'MALUR'),
    (40, 6, 'CHAMUNDI NGR'),
    (41, 7, 'MANJUNATH NAGAR'),
    (42, 7, 'GIRI NAGAR'),
    (43, 7, 'Nelamangala'),
    (44, 7, 'DEVARACHIKKANAHALLI'),
    (45, 7, 'NANDINI LAYOUT'),
    (46, 7, 'NAGASHETTIHALLI'),
    (47, 7, 'GKVK'),
    (48, 7, 'MATHIKERE'),
    (49, 7, 'DODDABOMMASANDRA'),
    (50, 7, 'ASHWATHNAGAR'),
    (51, 7, 'GUTTAHALLI'),
    (52, 7, 'CHAMARAJPET'),
    (53, 7, 'GIRINAGAR'),
    (54, 7, 'Singanayakanahalli'),
    (55, 7, 'KODIGEHALLI'),
    (56, 7, 'MUDDINAPALYA'),
    (57, 7, 'HAROHALLI'),
    (58, 7, 'JALAHALLI'),
    (59, 7, 'GOLLARAHATHI'),
    (60, 7, 'BANK COLONY'),
    (61, 7, 'PATTEGARPALYA'),
    (62, 7, 'CHIKKAKALLASANDRA'),
    (63, 7, 'BANASWADI'),
    (64, 7, 'VIVEKANANDANAGAR'),
    (65, 7, 'BANNERGHATTA ROAD'),
    (66, 7, 'R R NAGAR'),
    (67, 7, 'MAHALAKSHMI LAYOUT'),
    (68, 7, 'BASAWANGUDI'),
    (69, 7, 'SRINAGARA'),
    (70, 7, 'J.P.NAGAR'),
    (71, 7, 'KAMAKSHIPALYA'),
    (72, 7, 'SRINAGAR'),
    (73, 7, 'MADIWALA'),
    (74, 7, 'BTM LAYOUT'),
    (75, 7, 'J P NAGAR'),
    (76, 7, 'KODIGEGHALLI'),
    (77, 7, 'RAJANKUNTE'),
    (78, 7, 'DEVANAHALLI RD'),
    (79, 7, 'J.P NAGAR'),
    (80, 7, 'B T M LAYOUT'),
    (81, 7, 'Herohalli'),
    (82, 7, 'ULLAL MAIN ROAD'),
    (83, 7, 'MS PALYA'),
    (84, 7, 'DASANAPURA HOBLI'),
    (85, 7, 'MARUTHI NAGAR YELAHANKA'),
    (86, 7, 'SAHAKARNAGAR'),
    (87, 7, 'ULLAL BASTI'),
    (88, 7, 'YELHANKA'),
    (89, 7, 'JUDICIAL LAYOUT'),
    (90, 7, 'RUKMINI NAGAR'),
    (91, 7, 'JP NAGAR'),
    (92, 7, 'HESARGHATTA'),
    (93, 7, 'MALLESHWARAM'),
    (94, 7, 'NAGASHETTYHALLI'),
    (95, 7, 'LAKKASANDRA'),
    (97, 7, 'YESHWANTHPUR'),
    (98, 7, 'T.DASARAHALLI'),
    (99, 7, 'SAHAKARA NAGAR'),
    (100, 7, 'NAGENAHALLI'),
    (101, 7, 'NAGADEVANAHALLI'),
    (102, 7, 'HOSKEREHALLI'),
    (103, 7, 'MUDALPALYA'),
    (104, 7, 'Hesserghatta'),
    (105, 7, 'M S PALYA'),
    (106, 7, 'SOUTH END'),
    (107, 7, 'MAGADI ROAD'),
    (108, 7, 'ATTUR LAYOUT'),
    (109, 7, 'HONGASANDRA'),
    (110, 7, 'MANGAMMANAPALYA'),
    (111, 7, 'BAGLUR ROAD'),
    (112, 7, 'K.R.PURAM'),
    (113, 7, 'Padmanaba Nagar'),
    (114, 7, 'CHAMRAJPET'),
    (115, 7, 'Chinnanpalya'),
    (116, 7, 'J.C.NAGAR'),
    (117, 7, 'SRIRAMPURAM'),
    (118, 7, 'SHASTRI NAGAR'),
    (119, 7, 'SANJAY NAGAR'),
    (120, 7, 'PEENYA 2ND STG'),
    (121, 7, 'KOTTIGEPALYA'),
    (122, 7, 'PALACE GUTTAHALLI'),
    (123, 7, 'HEALTH LAYOUT'),
    (124, 7, 'BETTAHALASUR'),
    (125, 7, 'GANTIGANAHALLI'),
    (126, 7, 'JAKKUR LAYOUT'),
    (127, 7, 'MALLATHAHALLI'),
    (128, 7, 'ULLALMAIN ROAD'),
    (129, 7, 'MEDHAHALLI'),
    (130, 7, 'CHARMRAJPET'),
    (131, 7, 'TRIVENI ROAD'),
    (132, 7, 'TVS CROSS'),
    (133, 7, 'VIDYAPEETA CIRCLE'),
    (134, 7, 'BSK 2ND STAGE'),
    (135, 7, 'DODDA GOLLARAHATT'),
    (136, 7, 'BASAVESHWARANAGAR'),
    (137, 7, 'DEVANHALLI'),
    (138, 7, 'PAPAREDDYPALYA'),
    (139, 7, 'TOLLGATE'),
    (140, 7, 'OM SHIVA SHAKATHI NAGAR'),
    (141, 7, 'JAYANAGAR'),
    (142, 7, 'HEBBAL, KEMPAPURA'),
    (143, 7, 'DASARAHALLI'),
    (144, 7, 'DEVARACHIKKANA HALLI'),
    (145, 7, 'KENGERI'),
    (146, 7, 'BYDARAHALLI'),
    (147, 7, 'MACHOHALLI GATE'),
    (148, 7, 'UTTARHALLI'),
    (149, 7, 'BANASHANKARI'),
    (150, 7, 'KADIRENAHALLI'),
    (151, 7, 'Nageshettyhalli'),
    (152, 7, 'M E S ROAD'),
    (153, 7, 'BTM 4TH STAGE'),
    (154, 7, 'VIDYARANYAPURA'),
    (155, 7, 'ULLALA R.T.O'),
    (156, 7, 'ITPL'),
    (157, 7, 'KANAKANAGAR'),
    (158, 7, 'YELAHANKA'),
    (159, 7, 'LINGARAJPURAM'),
    (160, 7, 'MARIYAPPANAPALYA'),
    (161, 7, 'NEW BEL ROAD'),
    (162, 7, 'DEVANAHALLI'),
    (163, 7, 'TATA NAGAR'),
    (164, 7, 'ULLAL UPA NAGAR'),
    (165, 7, 'HOSKOTE'),
    (166, 7, 'VISHVESHWARAIAH LAYOUT'),
    (167, 7, 'SUNKADAKATTE'),
    (168, 7, 'PEENYA 1ST STG'),
    (169, 7, 'SEETHAPPA LAYOUT'),
    (170, 7, 'MALLASANDRA'),
    (171, 7, 'VIDYANAGAR CROSS'),
    (172, 7, 'CHIKKABANAVARA'),
    (173, 7, 'BEGUR ROAD'),
    (174, 7, 'RAJANUKUNTE'),
    (175, 7, 'BAGALKUNTE'),
    (176, 7, 'HEGGANAHALLI'),
    (177, 7, 'RAMACHANDRAPURA'),
    (178, 7, 'SRIGANDADAKAVALU'),
    (179, 7, 'J C NAGAR'),
    (180, 7, 'SONNENAHALLI'),
    (181, 7, 'SUBBAYANAPALYA'),
    (182, 7, 'MAGADI MAIN ROAD'),
    (183, 7, 'BOMMANAHALLI'),
    (184, 7, 'SONAPANAHALLI'),
    (185, 7, 'KATHRIGUPPE'),
    (186, 7, 'KATRIGUPPE'),
    (187, 7, 'ANJANAPURA'),
    (188, 7, 'AVALHALLI'),
    (189, 7, 'MOODALAPALYA'),
    (190, 7, 'PEENYA 2ND STAGE'),
    (191, 7, 'SRIGANDA KAVAL'),
    (192, 7, 'WILSON GARDEN'),
    (193, 7, 'PATTEGARAPALYA'),
    (194, 7, 'KAKOLU MAIN ROAD'),
    (195, 7, 'YELHANKA NEW TOWN'),
    (196, 7, 'DODDALADAMARA'),
    (197, 7, 'DODDABASTHI'),
    (198, 7, 'BSK'),
    (199, 7, 'VENKATALA'),
    (200, 7, 'KAKOLU MAIN ROAD'),
    (201, 7, 'VISVESHWARAIAH LAYOUT'),
    (202, 7, 'HANUMANTHANAGARA'),
    (203, 7, 'ANDRAHALLI'),
    (204, 7, 'GIDDADAKONENAHALLI'),
    (205, 7, 'DODDABASTI RD'),
    (206, 7, 'THINDLU'),
    (207, 7, 'ULLAL'),
    (208, 7, 'SARAKKI J.P.NAGAR'),
    (209, 7, 'SRIGANDHADAKAVAL'),
    (210, 7, 'MAHADESHWARANAGAR'),
    (211, 7, 'SRIGANDHAKAVAL'),
    (212, 7, 'CHANDRA LAYOUT'),
    (213, 7, 'SRIGANDAKAVL'),
    (214, 7, 'ANDHRAHALLI'),
    (215, 7, 'BHADRAPPA LAYOUT'),
    (216, 7, 'RAJAJINAGAR'),
    (217, 7, 'NAGARBHAVI'),
    (218, 7, 'AMRUTHAHALLI'),
    (219, 7, 'GOVINDRAJNAGAR'),
    (220, 7, 'NELLUMKUNTE VILLAGE'),
    (221, 7, 'SRINIVASNAGAR'),
    (222, 7, 'KACHOHALLI'),
    (223, 7, 'AMRUTHHALLI'),
    (224, 7, 'Narayanpura Cross'),
    (225, 7, 'SUNKADKATTE'),
    (226, 7, 'DODDA BASTHI'),
    (227, 7, 'ELLUKUNTE'),
    (228, 7, 'HONNENAHALLI'),
    (229, 7, 'MUDALAPALYA'),
    (230, 7, 'NELMANGALA'),
    (231, 7, 'VIJAYANAGAR'),
    (232, 7, 'GANGANAGAR'),
    (233, 7, 'GOVINDARAJANAGAR'),
    (234, 7, 'K L E LAW COLLEGE'),
    (235, 7, 'NAGASHETTY HALLI'),
    (236, 7, 'NAGARABHAVI MAIN ROAD'),
    (237, 8, 'KANAKANAGAR'),
    (238, 8, 'SARAPALYA'),
    (239, 8, 'K.R.PURAM'),
    (240, 8, 'SARAIPALYA'),
    (241, 8, 'SHAMPUR'),
    (242, 8, 'NAGAWARA'),
    (243, 8, 'LINGARAJAPURAM'),
    (244, 8, 'VENKATESHPURAM'),
    (245, 8, 'CHOLANAYAKANAHALLI'),
    (246, 8, 'HBR'),
    (247, 8, 'SAMPIGEHALLI'),
    (248, 8, 'THANISANDRA'),
    (249, 8, 'SSA ROAD HEBBAL'),
    (250, 8, 'KODIGEHALLI'),
    (251, 8, 'KAVERY NAGAR'),
    (252, 8, 'KAMMANAHALLI'),
    (253, 8, 'BHUVANESHWARI NAGAR'),
    (254, 8, 'Manjunatha Nagar'),
    (255, 8, 'RAMAMURTHYNAGAR'),
    (256, 8, 'BANASWADI'),
    (257, 8, 'Sultan Ply'),
    (258, 8, 'SHIVAJI NAGAR'),
    (259, 8, 'HENNUR MAIN ROAD'),
    (260, 8, 'THIPPASANDRA'),
    (261, 8, 'CHANNASANDRA MAIN ROAD'),
    (262, 8, 'K B SANDRA'),
    (263, 10, 'K.R.MARKET'),
    (264, 10, 'TANNERY ROAD'),
    (265, 7, 'M M Layout'),
]

CUSTOMERS = [
    # (shop_name, area_id, credit_limit, is_active)
    ('ANANDA HARDWARE', 1, 200000.0, True),
    ('BALAJI HARDWARE&ELEC\'S', 2, 500000.0, True),
    ('MAHALAKSHMI H/W AND ELECTRICALS', 3, 300000.0, True),
    ('MAHALAXMI HARDWARE & ELEC\'S', 4, 400000.0, True),
    ('NEW SRI HARISH HARDWARE STORES', 5, 150000.0, True),
    ('OMKAR HARDWARE', 2, 350000.0, True),
    ('POPULAR HARDWARE & PAINTS', 5, 350000.0, True),
    ('SHREE MAHALAKSHMI PAINTS & HARDWARE', 5, 350000.0, True),
    ('SRI ANNAPURNESHWARI PAINTS & H/W, ELEC', 4, 350000.0, True),
    ('SRI KANAKA PAINTS & HARDWARE', 4, 350000.0, True),
    ('SRI MARUTHI H/W', 2, 350000.0, True),
    ('SRI SAI ENTERPRISES', 5, 350000.0, True),
    ('Sri Sevalalji Hardware & Electrical', 6, 350000.0, True),
    ('Sri Shankar Hardware', 7, 350000.0, True),
    ('AMBAY ELECTRICAL & HARDWARE', 8, 350000.0, True),
    ('DIWAKAR HARDWARE & ELC', 9, 350000.0, True),
    ('KAMAL ELECTRICALS & HARDWARE', 10, 350000.0, True),
    ('KRISHNA HARDWARE & ELECTRICALS', 8, 350000.0, True),
    ('NEW SUN ELE & H/W', 8, 350000.0, True),
    ('RADHEY KRISHNA ELECTRICALS & HARDWARE', 8, 350000.0, True),
    ('RAJAN HARDWARE', 8, 350000.0, True),
    ('ROYAL ELECTRICALS & HARDWARE', 11, 350000.0, True),
    ('SRI KRISHNA TRADERS', 8, 350000.0, True),
    ('SRI VENKATESWARA PAINTS AND HADWARE', 8, 350000.0, True),
    ('SUN ELECTRICALS & HARDWARE', 8, 350000.0, True),
    ('ADISHAKTHI TRADERS', 12, 350000.0, True),
    ('AL- BADHAR STEEL & HARDWARE', 13, 350000.0, True),
    ('ANANDA PAINTS & HARDWARE', 14, 0, True),
    ('ARIHANTH HARDWARE', 14, 0, True),
    ('BAHUBALI HARDWARE', 15, 0, True),
    ('BHARATH HARDWARE & PAINTS', 12, 0, True),
    ('CHANDRAGIRI PAINTS & HARDWARE', 17, 0, True),
    ('GANAPATHY GLASS & PLYWOOD', 18, 0, True),
    ('GANESH HARDWARE & ELC', 19, 0, True),
    ('HEMA GLASS & PLYWOOD', 14, 0, True),
    ('HINDUSTHAN TRADERS', 20, 0, True),
    ('JAGADAMBA PAINTS & HARDWARE', 12, 0, True),
    ('JANA ENTERPRISES', 12, 0, True),
    ('JAY RAMS HARDWARE STORES', 21, 0, True),
    ('KARTHIK PAINTS & HARDWARE', 14, 0, True),
    ('KOHINOOR HARDWARE', 14, 0, True),
    ('KUMAR HARDWARE', 18, 0, True),
    ('KUMAR HARDWARE & PAINTS', 14, 0, True),
    ('KUSHI HARDWARES', 17, 0, True),
    ('MARUTHI PAINTS', 21, 0, True),
    ('M.A.S GLASS & PLYWOOD', 22, 0, True),
    ('M.K.HARDWARE', 22, 0, True),
    ('MURTHY TRADERS', 12, 0, True),
    ('NATIONAL AGRO HARDWARE', 22, 0, True),
    ('NIHARIKA BUILDING SOLUTIONS', 23, 0, True),
    ('POOJA HARDWARE', 14, 0, True),
    ('RANGANATH TRADERS PAINTS & HW', 21, 0, True),
    ('SANDESH HARDWARE', 15, 0, True),
    ('SHANTHINATHA HARDWARE', 23, 0, True),
    ('SHEKAR PAINTS & CERAMICS', 21, 0, True),
    ('SHIVSHAKTHI HARDWARE', 23, 0, True),
    ('SHOP SIDDEGOWDA & SONS', 12, 0, True),
    ('S.K ENTERPRISES', 20, 0, True),
    ('S.N.A.TRADERS', 12, 0, True),
    ('SRI BENAKA TRADERS', 17, 0, True),
    ('SRI CHANNAKESHAWA HARDWARE', 13, 0, True),
    ('SRI KOLLAPURADAMMA PAINT & HARDWRAE', 17, 0, True),
    ('SRI LAKSHMI PAINTS & HARDWARE', 21, 0, True),
    ('SRI RAMAKRISHNA STORES', 14, 0, True),
    ('SRI RANGANATHA TRADERS', 24, 0, True),
    ('SRI RANGANATH HARDWARE', 14, 0, True),
    ('SRI RANGANATH STORES', 20, 0, True),
    ('SRI SURESH ENTERPRISES', 21, 0, True),
    ('SRI THIRUMALA ENTERPRISES', 17, 0, True),
    ('SRI THIRUMALA PAINTS & HARDWARE', 21, 0, True),
    ('SRI VINAYAKA TILES AND HARDWARE', 19, 0, True),
    ('SUPRIYA PAINTS & HARDWARE', 14, 0, True),
    ('VIJAY ENTERPRISES', 14, 0, True),
    ('ANUSHA TRADERS', 25, 0, True),
    ('ATCHAM STEEL TRADERS', 26, 0, True),
    ('BHOOMI PLYWOOD & GLASS', 27, 0, True),
    ('B.S HINDUSTAN HARDWARE', 28, 0, True),
    ('GEEVER METAL & HARDWARE', 29, 0, True),
    ('KRISHNA TRADERS', 25, 0, True),
    ('MAHALAKSHMI GLASS PLYWOOD & HARDWARE', 30, 0, True),
    ('MAHALAXMI HARDWARES & ELECTRICALS', 31, 0, True),
    ('M.N.HARDWARE & PAINTS', 32, 0, True),
    ('MOHAN H/W AND ELEC.', 25, 0, True),
    ('NEW ASIAN COLOUR CENTER', 33, 0, True),
    ('NEW KOMAL TRADERS', 25, 0, True),
    ('NEW PATEL GLASS & HARDWARE', 30, 0, True),
    ('N.P.DHARNAPPA', 25, 0, True),
    ('RAGHAVENDRA HARDWARE & ELECTRICALS', 34, 0, True),
    ('RAGHU HARDWARE', 35, 0, True),
    ('RIHAN TRADERS', 25, 0, True),
    ('R.K.HARDWARE & PAINTS', 32, 0, True),
    ('SAMEENA ENTERPRISES', 32, 0, True),
    ('SAMEENA HARDWARE& PAINTS', 32, 0, True),
    ('SANTOSH HARDWARE & ELC', 31, 0, True),
    ('SHIVANANDAM', 25, 0, True),
    ('SHREE CHAMUNDESHWARI MARKETING', 25, 0, True),
    ('S M T HARDWARE STEEL &PLYWOOD', 32, 0, True),
    ('SRI CHAMUNDESHWARI TRADERS', 30, 0, True),
    ('SRI GURURAGHAVENDRA TRADERS', 25, 0, True),
    ('SRI KAVERI PAINTS & HARDWARE', 25, 0, True),
    ('SRI MAHADESHWARA', 36, 0, True),
    ('SRI PARVATHI ENTERPRISES', 32, 0, True),
    ('SRI RAMDEV ELEC\'S & HARDWARE', 35, 0, True),
    ('SUMUKHA ENTERPRISES', 37, 0, True),
    ('SURYA HARDWARE AND ELECTRICALS', 30, 0, True),
    ('TAJ ELECTRICALS & HARDWARE', 35, 0, True),
    ('VENKATESHWARA TRADERS', 32, 0, True),
    ('VINAYAKA HARDWARE', 37, 0, True),
    ('VINAYAKA TRADERS', 38, 0, True),
    ('LAXMI HARDWARE & ELECTRICAL', 39, 0, True),
    ('K.M.TRADERS', 40, 0, True),
    ('ADIKESHAVA TRADERS', 41, 0, True),
    ('ADISHWAR BUILD MART', 42, 0, True),
    ('AMAR ELECTRICAL& HARDWARE', 43, 0, True),
    ('AMAR ELECTRICALS & HARDWARE', 44, 0, True),
    ('AMBA TRADERS', 45, 0, True),
    ('AMBE MATAJI HARDWARE', 46, 0, True),
    ('AMBIKA HARDWARE& ELECTRICALS', 47, 0, True),
    ('AMBIKA HARDWARE', 48, 0, True),
    ('AMBIKA HARDWARE & SANITARY', 49, 0, True),
    ('A.M. HARDWARE & PAINTS', 50, 0, True),
    ('A. N.A HARDWARE & PAINTS', 51, 0, True),
    ('ANAND ENTERPRISES', 52, 0, True),
    ('ANAND HARDWARE', 53, 0, True),
    ('Anand Steel', 54, 0, True),
    ('ANJANI GLASS & PLYWOOD', 55, 0, True),
    ('ARIHANT HARDWARE', 56, 0, True),
    ('ARVITHA TRADERS', 43, 0, True),
    ('ASHAPURA HARDWARE & Elc', 57, 0, True),
    ('A S HARDWARE AND PAINTS', 58, 0, True),
    ('ASHOKA HARDWARE & PAINTS', 59, 0, True),
    ('ASHWINI PAINTS & HARDWARE', 60, 0, True),
    ('BALAJI ENETERPRISES', 61, 0, True),
    ('BALAJI HARDWARE & CERAMIC', 57, 0, True),
    ('BALAJI HARDWARE', 62, 0, True),
    ('BALAJI HARDWARE & ELECTRICALS', 63, 0, True),
    ('BALAJI HARDWARE', 64, 0, True),
    ('BALAJI H/W', 65, 0, True),
    ('BALAJI PAINTS ELECTRICALS', 66, 0, True),
    ('BALAJI TOOLS & HADRWARE', 67, 0, True),
    ('BANGALORE HARDWARE & SANITARYWARE', 68, 0, True),
    ('BANGALORE HARDWARE', 69, 0, True),
    ('BANGALORE TRADERS', 70, 0, True),
    ('BHARAT HARDWARE', 71, 0, True),
    ('BHARAT HARDWARE & PAINTS', 72, 0, True),
    ('BHARATH & CO', 73, 0, True),
    ('BHARATH HARDWARE', 74, 0, True),
    ('BHARATH TRADERS', 75, 0, True),
    ('BHAVANI HARDWARE & ELC\'S', 76, 0, True),
    ('BHAVANI HARDWARE & ELECTRICALS', 77, 0, True),
    ('BHAVANI HARDWARE & SANITARY', 78, 0, True),
    ('BHERU HARDWARE & PAINTS', 79, 0, True),
    ('B T M HARDWARE', 80, 0, True),
    ('DARSHAN HARDWARE', 43, 0, True),
    ('Dhanalakshmi Hardware & Elc', 81, 0, True),
    ('DHANALAKSHMI HARDWARE & ELC', 82, 0, True),
    ('DHANALAKSHMI HARDWARE & ELECTRICALS', 77, 0, True),
    ('DHANALAKSHMI HARDWARE', 83, 0, True),
    ('DHANALAXMI HARDWARE', 84, 0, True),
    ('DHAN LAKSHMI HARDWARE', 85, 0, True),
    ('DHANLAKSHMI', 86, 0, True),
    ('DHANLAXMI HARDWARE', 87, 0, True),
    ('DHANUSH PLUMBING & HARDWARE', 88, 0, True),
    ('DHANUSH PLUMBING & HJARDWARE', 89, 0, True),
    ('DHANVARSHA HARDWARE & PAINTS', 90, 0, True),
    ('DHISHAN ENTERPRISES', 67, 0, True),
    ('DIWAKAR PAINTS & HARDWARE', 48, 0, True),
    ('D.P.HARDWARE', 91, 0, True),
    ('GANAPATHI HARDWARE GLASS & PLYWOOD', 92, 0, True),
    ('GANAPATHI HARDWARE & PAINTS', 93, 0, True),
    ('GANESH HARDWARE', 94, 0, True),
    ('GIRNAR HARDWARE & PAINTS', 72, 0, True),
    ('GOLDEN HARDWARES', 95, 0, True),
    ('GOWRISHANKAR & COMPANY', 265, 0, True),
    ('G.S.HARDWARES & PAINTS', 97, 0, True),
    ('HALLI TRADERS', 92, 0, True),
    ('HANUMAN ENTERPRISES', 98, 0, True),
    ('HANUMAN HARDWARE', 48, 0, True),
    ('HANUMAN HARWARE', 99, 0, True),
    ('HEERA ELECTRICALS & H/W', 100, 0, True),
    ('HI-CHOICE ENTERPRISES', 101, 0, True),
    ('HINDUSTAN HARDWARE & SANITARY', 102, 0, True),
    ('HIRA COLOR WORLD', 103, 0, True),
    ('Jagadamba Hardware & Elc', 104, 0, True),
    ('JAI BHARATH TRADERS', 105, 0, True),
    ('JAI CHANDRA HARDWARE', 106, 0, True),
    ('JAI HANUMAN HARDWARE', 55, 0, True),
    ('JAI MARUTHI TRADERS', 107, 0, True),
    ('JAIN ELECTRICAL & HARDWARE', 108, 0, True),
    ('JAI SRI KRISHNA HARDWARE', 109, 0, True),
    ('JAY MATHAJI PAINTS & CERAMIC', 110, 0, True),
    ('JAYSHREE HARDWARE', 111, 0, True),
    ('J.B.R.TRADE CORPORATION', 112, 0, True),
    ('kalassic Intrior Traders', 113, 0, True),
    ('KAMADHENU BUILDING SOLUTIONS', 114, 0, True),
    ('Kamadhenue Bldg., Solutions', 115, 0, True),
    ('KAMITAARTHA AGENCY', 109, 0, True),
    ('KARNATAKA HARDWARE AND PAINTS', 91, 0, True),
    ('KARNATAKA HARDWARE', 116, 0, True),
    ('KARNATAKA HARDWARE & PAINTS', 91, 0, True),
    ('KARNATAKA H/W & PAINTS', 117, 0, True),
    ('KARNATAKA PAINTS & HARDWARE', 118, 0, True),
    ('KARNATAKA TRADERS', 119, 0, True),
    ('KAVERI ENTERPRISES', 43, 0, True),
    ('KAVERI HARDWARE & ELECRTICALS', 77, 0, True),
    ('KEERTHI PAINTS & HARDWARE', 120, 0, True),
    ('KIRAN ELC\'S & HARDWARE', 121, 0, True),
    ('K.L.R. HARDWARE & PAINTS', 122, 0, True),
    ('KRISHNA ELECTRICALS & HARDWARE', 123, 0, True),
    ('KRISHNA ELECTRICALS & HARDWARE', 94, 0, True),
    ('KRISHNA ENTERPRISES', 124, 0, True),
    ('KRISHNA HARDWARE & ELC', 125, 0, True),
    ('KRISHNA HARDWARE & ELC', 77, 0, True),
    ('KRISHNA HARDWARE & ELECTRICALS', 126, 0, True),
    ('KRISHNA HARDWARE', 127, 0, True),
    ('KRISHNA PLYWOOD & HARDWARE', 128, 0, True),
    ('KRISHNA TRADINGS', 56, 0, True),
    ('LAKSHMI CERAMICS & HARDWARE', 129, 0, True),
    ('LAKSHMI ELECTRICALS & HARDWARE', 100, 0, True),
    ('LAKSHMI HARDWARE', 130, 0, True),
    ('LAKSHMI HARDWARE', 93, 0, True),
    ('LAKSHMI HARDWARE', 48, 0, True),
    ('LUCKY PAINT CENTER', 131, 0, True),
    ('MADAN ENTERPRISES', 132, 0, True),
    ('MADHU ENTERPRISES', 133, 0, True),
    ('M A ENTERPRISES', 134, 0, True),
    ('MAHADEV HARDWARE & ELECTRICALS', 135, 0, True),
    ('MAHADEV HARDWARE & ELECTRICALS', 43, 0, True),
    ('MAHADEV HARDWARE & ELECTRICALS', 54, 0, True),
    ('MAHALAKSHMI ENTERPRISES', 136, 0, True),
    ('MAHALAKSHMI HARDWARE & ELECTRICALS', 137, 0, True),
    ('MAHALAKSHMI H/W & ELEC', 43, 0, True),
    ('MAHALAKSHMI HW GLASS & PLYWD', 138, 0, True),
    ('MAHALAXMI HARDWARE & ELECTRICALS', 139, 0, True),
    ('MAHALAXMI HARDWARE', 55, 0, True),
    ('MAHALAXMI HARDWARE', 72, 0, True),
    ('MAHARAJA', 140, 0, True),
    ('MAHAVEER HARDWARE & CABLES', 141, 0, True),
    ('MAHAVEER HARDWARE', 142, 0, True),
    ('MAHAVEER PAINTS & SANITARY', 143, 0, True),
    ('MAHESH HARDWARE', 127, 0, True),
    ('MAJISA HARDWARE & PAINTS', 144, 0, True),
    ('MAMATHA HARDWARE', 145, 0, True),
    ('MAMTA HARDWARE', 146, 0, True),
    ('MAMTA HARDWARE', 147, 0, True),
    ('MAMTA HARDWARE', 122, 0, True),
    ('MAMTHA HARDWARE & ELECTRICALS', 88, 0, True),
    ('MANJUSHREE GLASS & PLY', 148, 0, True),
    ('MATAJI HARDWARE', 149, 0, True),
    ('MATAJI HARDWARE', 150, 0, True),
    ('MATHAJI ENTERPRISES', 151, 0, True),
    ('MATHAJI HARDWARE & ELECTRICALS', 43, 0, True),
    ('MATHAJI HARDWARE', 126, 0, True),
    ('MATHAJI HARDWARE', 152, 0, True),
    ('MATHAJI HARDWARE & PAINTS', 153, 0, True),
    ('MATHAJI HARDWARE & SANITARIWARE', 154, 0, True),
    ('MATHAJI HARDWARE', 155, 0, True),
    ('MATHAJI HARDWARE', 156, 0, True),
    ('MATHAJI H/W AND CO', 110, 0, True),
    ('MATHAJI STORES', 67, 0, True),
    ('M.A TRADING CO.', 157, 0, True),
    ('MEENAKSHI HARDWARE & ELECTRICALS', 158, 0, True),
    ('MEENAKSHI HARDWARE &SANITARY', 74, 0, True),
    ('METRO HARDWARE & SUPPLY', 159, 0, True),
    ('M G HARDWARE &PAINTS', 108, 0, True),
    ('M.L.K. & CO', 160, 0, True),
    ('M M RETAIL', 143, 0, True),
    ('MOKSH HARDWARE & SANITARY', 161, 0, True),
    ('MONIKA HARDWARE', 154, 0, True),
    ('MOTHER HARDWARE', 162, 0, True),
    ('M.S.COLOUR WORLD', 163, 0, True),
    ('NANDHI PAINTS', 94, 0, True),
    ('NARMADA HARDWRAE', 164, 0, True),
    ('NATIONAL HARDWARE & PAINTS', 134, 0, True),
    ('N.D.TRADERS', 154, 0, True),
    ('NEW MATHAJI INDUSTRIAL STORE', 107, 0, True),
    ('NEW PAVITHRA HARDWARE & ELECTRICALS', 165, 0, True),
    ('NEW R K HARDWARE & PAINTS', 66, 0, True),
    ('NIHAA HARDWARE ELECTRICALS', 166, 0, True),
    ('NIRMAL HARDWARE & ELECTRICALS', 66, 0, True),
    ('OM HARDWARE & ELECTRICALS', 167, 0, True),
    ('OM SAAI ENTERPRISES', 105, 0, True),
    ('PAINTS PALACE INDUSTRIAL TOOLS & HARDWARE', 168, 0, True),
    ('PARAKH CERAMICS', 158, 0, True),
    ('PARAS HARDWARE', 71, 0, True),
    ('PARRY\'S HARDWARE SANITARY & ELC', 169, 0, True),
    ('PAVITHRA HARDWARE & ELECTRICALS', 108, 0, True),
    ('PAVITHRA HARDWARE & ELECTRICALS', 170, 0, True),
    ('PAWAN HARDWARE', 120, 0, True),
    ('PEEJAY HARDWARE', 48, 0, True),
    ('POOJA ELC\'S & HARDWARE', 171, 0, True),
    ('POOJA ELECTRICALS & HARDWARE', 172, 0, True),
    ('POOJA ENTERPRISES', 173, 0, True),
    ('POOJA HARDWARE & ELECTRICALS', 174, 0, True),
    ('POONAM PAINTS & CERAMICS', 172, 0, True),
    ('POPULAR HARDWARE GLASS & PLY', 175, 0, True),
    ('POPULAR HARDWARE PAINTS', 80, 0, True),
    ('PRAKASH ENTERPRISES', 143, 0, True),
    ('PRAKASH HARDWARE', 176, 0, True),
    ('PRAKASH HARDWARE', 105, 0, True),
    ('PREM ELECTRICALS & HARDWARE', 43, 0, True),
    ('PRINCE STORES', 177, 0, True),
    ('RADHA KRISHNA HARDWARE& ELC\'S', 178, 0, True),
    ('RADHE KRISHNA ENTERPRISES', 179, 0, True),
    ('RADHESHAM ELECTRICALS & HARDWARE', 43, 0, True),
    ('RAJALAKSHMI ELC & HARDWARE', 109, 0, True),
    ('RAJALAKSHMI ELEC & HARDWARE', 71, 0, True),
    ('RAJALAKSHMI HARDWARE & ELC', 180, 0, True),
    ('RAJ KAMAL CERAMIC', 148, 0, True),
    ('RAJLAKSHMI H/W & CERAMICS', 181, 0, True),
    ('RAJ NANDI ENTERPRISES', 182, 0, True),
    ('RAJSHREE HARDWARE', 183, 0, True),
    ('RAM 6 ENTERPRISES', 184, 0, True),
    ('RAMA HARDWARE', 185, 0, True),
    ('RAMAJI HARDWARE & ELECTRICALS', 167, 0, True),
    ('RAMDEV ELECTRCALS & HARDWARE', 71, 0, True),
    ('RAMDEV ENTERPRISES', 107, 0, True),
    ('RAMDEV HARDWARE', 186, 0, True),
    ('RAMDEV SALES CORPORATION', 187, 0, True),
    ('RAMDEV TRADING', 188, 0, True),
    ('RAM ELECTRICALS & HARDWARE', 189, 0, True),
    ('RAM ELECTRICALS & HARDWARE', 171, 0, True),
    ('RAM ENTERPRISES', 48, 0, True),
    ('RAVI ENETRPRISES', 190, 0, True),
    ('REKHA HARDWARE & CERAMIC', 82, 0, True),
    ('REKHA HARDWARE', 191, 0, True),
    ('RIDDHI SIDDHI HARDWARE', 66, 0, True),
    ('R MANISH PAINTS & HARDWARE', 107, 0, True),
    ('ROYAL ENTERPRISES', 94, 0, True),
    ('ROYAL HARDWARE TRADING COMPANY', 192, 0, True),
    ('R S PAINTS & HARDWARE', 185, 0, True),
    ('SAGAR ELC & HARDWARE', 88, 0, True),
    ('SAGAR HARDWARE', 193, 0, True),
    ('SAMRUDHI ELECTRICAL & PAINTS', 194, 0, True),
    ('SANGAM HARDWARE', 195, 0, True),
    ('SANGEETHA HARDWARE', 196, 0, True),
    ('SARASWATI ENTERPRISES', 107, 0, True),
    ('SAROJINI HARDWARE', 97, 0, True),
    ('SEHION HARDWARE & PAINTS', 197, 0, True),
    ('SHIVA HARDWARE & CERAMICS', 77, 0, True),
    ('SHIV HARDWARE & PAINTS', 141, 0, True),
    ('SHIV SHAKTHI H/W & ELE', 54, 0, True),
    ('SHREE BASAVA TRADERS', 105, 0, True),
    ('Shree Bhagyalakshmi Enterprises', 43, 0, True),
    ('SHREE HARDWARE STORES', 88, 0, True),
    ('SHREE MATHAJI SANITARY', 58, 0, True),
    ('SHREE PARVATHI PAINTS & SANITARYWARE', 198, 0, True),
    ('SHREE PAWAN HARDWARE', 149, 0, True),
    ('SHREE RAGHAVENDRA PAINTS', 98, 0, True),
    ('SHREE SAI BALAJI TRADERS', 86, 0, True),
    ('SHRI CHARBHUJA HARDWARE', 183, 0, True),
    ('SHUBHAM HARDWARE & ELECTRICALS', 199, 0, True),
    ('SIDDHANSH INFRACON', 200, 0, True),
    ('SIGMA ENTERPRISES', 66, 0, True),
    ('S L C ENTERPRISES', 100, 0, True),
    ('S.L.I HW & ELE', 201, 0, True),
    ('SLN ENTERPRISES', 202, 0, True),
    ('S.L.V HARDWARE', 203, 0, True),
    ('S M ENTERPRISES', 204, 0, True),
    ('SMS CREATIONS H/W & ELEC.', 205, 0, True),
    ('SREE BALAJI PAINTS & HARDWARES', 55, 0, True),
    ('SREE GANAPATHI HARDWARE & ELC', 43, 0, True),
    ('SREE KANTESWARA ENTERPRISES', 139, 0, True),
    ('SREE LAKSHMI HARDWARE & PAINTS', 206, 0, True),
    ('SREE MAATAA HARDWARE', 180, 0, True),
    ('SREE MANJUNATHA ELECTRICALS', 162, 0, True),
    ('SREE OM ELECTRICALS & HARDWARE', 162, 0, True),
    ('SREE RENUKA PAINTS H/W & SANITARY', 207, 0, True),
    ('SREE SAPTHAGIRI ENTERPRISES', 208, 0, True),
    ('SREEVARI TRADERS', 209, 0, True),
    ('SRI ANJANADRI TRADERS', 77, 0, True),
    ('SRI BALAJI HARDWARE & ELC', 210, 0, True),
    ('SRI BALAJI HARDWARE & ELECTRICALS', 143, 0, True),
    ('SRI BALAJI HARDWARE &ELECTRICALS', 211, 0, True),
    ('SRI BASAVEAHWARA TRADERS', 98, 0, True),
    ('SRI BASAWESHWARA ENTERPRISES', 212, 0, True),
    ('SRI BYRAVESHWARA H/W SANI & PAINTS', 213, 0, True),
    ('SRI C R S HARDWARE AND PAINTS', 119, 0, True),
    ('SRI DURGA TRADERS', 154, 0, True),
    ('SRI ESHWARA ENTERPRISES', 214, 0, True),
    ('SRI GANESHA ENTERPRISES', 215, 0, True),
    ('SRI GANGADHARESHWARA HARDWARE', 43, 0, True),
    ('SRI GAYATHRI TRADERS', 154, 0, True),
    ('SRI GURUKRUPA HARDWARE', 216, 0, True),
    ('SRI GURUKRUPA TRADERS', 217, 0, True),
    ('SRI HANUMAN GLASS PLYWD & HARDWARE', 218, 0, True),
    ('SRI JINNAMBIKE DEVI HARDWARE', 219, 0, True),
    ('SRI KRISHNA HARDWARE', 112, 0, True),
    ('Sri KRISHNA HARDWAREM & SANITARY', 183, 0, True),
    ('SRI LAKSHMI HARDWARE', 101, 0, True),
    ('SRI LAKSHMI NARASIMHA ENTP', 220, 0, True),
    ('SRI LAKSHMI PAINTS & HW', 221, 0, True),
    ('SRI LAKSHMI TRADERS', 45, 0, True),
    ('SRI LAKSHMI VENKATESHWARA PAINTS & HW', 222, 0, True),
    ('SRI MAHALAXMI HARDWARE & ELC', 77, 0, True),
    ('SRI MANJUNATHA ELEC H/W &PAINTS', 192, 0, True),
    ('SRI MANJUNATHA PAINTS & H/W', 71, 0, True),
    ('SRI MANJUNATHA TRADERS', 223, 0, True),
    ('SRI MANJUNATHA TRADERS', 55, 0, True),
    ('SRI MARUTHI ELE & H/W', 82, 0, True),
    ('SRI MARUTHI ENTERPRISES', 224, 0, True),
    ('SRI MARUTHI TRADERS', 92, 0, True),
    ('SRI MATHAJI ENTERPRISES', 225, 0, True),
    ('SRI NAKODA HARDWARE GLASS & PLYWOOD', 226, 0, True),
    ('SRI NANJUDESHWARA PLY & H/W', 222, 0, True),
    ('SRI NANJUNDESHWARA HARDWARE', 43, 0, True),
    ('SRI RAKSHA COLOR WORLD', 217, 0, True),
    ('SRI RAM HARDWARE & PLYWOOD', 227, 0, True),
    ('SRI RANGA PAINTS & HARDWARE', 127, 0, True),
    ('SRI SAI H/W & PAINTS', 192, 0, True),
    ('SRI SAI RAM ENTERPRISES', 228, 0, True),
    ('SRI S.M.Y ENTERPRISES', 206, 0, True),
    ('SRI SRINIVASA ENTERPRISES', 107, 0, True),
    ('SRI SRINIVASA PAINTS & H/W', 44, 0, True),
    ('SRI SURYA HARDWARE & ELECTRICALS', 43, 0, True),
    ('SRI VASAVI HARDWARE', 58, 0, True),
    ('SRI VENKATESHWARA ENTERPRISES', 66, 0, True),
    ('SRI VENKATESHWARA PAINTS & HARDWARE', 145, 0, True),
    ('SRI VENKATESHWARA TRADERS', 212, 0, True),
    ('SRI VINAYAKA TRADERS', 141, 0, True),
    ('SRI VISHNUPRIYA HARDWARE', 229, 0, True),
    ('SRS HARDWARES & ENGINEERING WORKS', 43, 0, True),
    ('S R S TRADERS', 230, 0, True),
    ('STAR HARDWARE &PAINTS', 48, 0, True),
    ('SUPER ENTERPRISES', 98, 0, True),
    ('SURAJ ENTERPRISES', 195, 0, True),
    ('SURYA HARDWARE & SANITARY WARE', 109, 0, True),
    ('SURYA SANITATION', 231, 0, True),
    ('S . V TRADERS', 45, 0, True),
    ('TEJASVI ELECTRICALS', 91, 0, True),
    ('THE BEST HARDWARE', 97, 0, True),
    ('THEJUS HARDWARE', 232, 0, True),
    ('UDAYA TRADERS', 233, 0, True),
    ('VARNA HOMES', 234, 0, True),
    ('VARSHA PAINTS AND HARDWARE', 185, 0, True),
    ('VARUN TRADERS & HARDWARE', 235, 0, True),
    ('VEEKAY TRADERS', 97, 0, True),
    ('VIDYA ENTERPRISES', 138, 0, True),
    ('VIJAY PAINTS', 65, 0, True),
    ('VINAYAKA HARDWARE & CERAMICS', 86, 0, True),
    ('V R MANJU COLOUR WORLD', 236, 0, True),
    ('A. S HARDWARE', 157, 0, True),
    ('BALAJI ELECTRICAL & HW', 238, 0, True),
    ('BALAJI HARDWARE', 112, 0, True),
    ('BHARATH ENTERPRISES H/W & ELEC', 240, 0, True),
    ('BHARATH ENTERPRISES', 241, 0, True),
    ('BHARATH HARDWARE & PAINTS', 242, 0, True),
    ('CITY ENTERPRISES', 157, 0, True),
    ('DEEN TRADERS', 243, 0, True),
    ('G.K.HARDWARE', 244, 0, True),
    ('HANUMAN ELE & HARDWARE', 245, 0, True),
    ('INDIAN HARDWARE & PAINTS', 246, 0, True),
    ('KARNATAKA HARDWARE & PAINTS', 246, 0, True),
    ('KAVERI HARDWARE & ELECTRICALS', 247, 0, True),
    ('KAVERY ELECTRICAL & HARDWARE', 248, 0, True),
    ('KRISHNA H/W PAINTS & CEMENT', 249, 0, True),
    ('MADEENA HARDWARE & PLUMBING', 241, 0, True),
    ('MAHALAXMI HARDWARE', 55, 0, True),
    ('MAMATHA HARDWARE', 157, 0, True),
    ('MATHAJI ELECTRICALS & HARDWARE', 251, 0, True),
    ('MATHAJI HARDWARE', 55, 0, True),
    ('MATHAJI HARDWARE & PAINTS', 242, 0, True),
    ('MATHAJI HARDWARE & SANITARYWARE', 252, 0, True),
    ('NEXUS ENTERPRISES', 253, 0, True),
    ('PEEYES HARDWARE', 254, 0, True),
    ('PEEYES HARDWARE', 255, 0, True),
    ('PRAKASH HARDWARE', 63, 0, True),
    ('ROYAL ENTERPRISES', 257, 0, True),
    ('SIRAJ PAINTS STORES', 258, 0, True),
    ('SK HW & PLYWOOD', 259, 0, True),
    ('SRI BALAJI TRADING CORPORATION', 260, 0, True),
    ('SRI BYRAVESHWARA GLASS,PLAYWOOD &HARDWARE', 261, 0, True),
    ('SRINIVASA TRADERS', 243, 0, True),
    ('STAR HARDWARE & ELECTRICALS', 262, 0, True),
    ('ADNAN TRADERS', 263, 0, True),
    ('MOUNTAIN PAINT', 264, 0, True),
]

def seed_routes(db):
    created = 0
    for route_num, route_type in ROUTES:
        existing = db.query(Route).filter_by(route_number=route_num).first()
        if not existing:
            db.add(Route(route_number=route_num, type=RouteType(route_type)))
            created += 1
    db.commit()
    print(f"  Routes   : {created} created, {len(ROUTES) - created} skipped")


def seed_areas(db):
    created = 0
    skipped = 0
    # Build route_number -> Route object lookup
    route_map = {r.route_number: r for r in db.query(Route).all()}

    for area_id, route_num, area_name in AREAS:
        route = route_map.get(route_num)
        if not route:
            print(f"  ⚠️  Route {route_num} not found — skipping {area_name}")
            continue
        existing = db.query(Area).filter_by(name=area_name, route_id=route.id).first()
        if not existing:
            db.add(Area(name=area_name, route_id=route.id))
            created += 1
        else:
            skipped += 1
    db.commit()
    print(f"  Areas    : {created} created, {skipped} skipped")


def seed_users(db):
    created = 0
    for name, email, phone, role in USERS:
        existing = db.query(User).filter_by(email=email).first()
        if not existing:
            db.add(User(
                name=name,
                email=email,
                phone=phone,
                hashed_password=hash_password(DEFAULT_PASSWORD),
                role=UserRole(role),
                is_active=True,
            ))
            created += 1
    db.commit()
    print(f"  Users    : {created} created, {len(USERS) - created} skipped")
    print(f"  Password : {DEFAULT_PASSWORD} (change after first login)")


def seed_customers(db):
    from app.modules.customers.model import Customer

    # Build area_id lookup from CSV area_id to DB area object
    # We match by name since DB IDs may differ from CSV IDs
    all_areas = db.query(Area).all()
    area_name_map = {a.name.upper(): a for a in all_areas}

    # Also build CSV area_id -> area_name lookup
    csv_area_map = {aid: name for aid, _, name in AREAS}

    created = 0
    skipped = 0
    not_found = 0

    for shop_name, csv_area_id, credit_limit, is_active in CUSTOMERS:
        area_name = csv_area_map.get(csv_area_id, "").upper()
        area = area_name_map.get(area_name)

        if not area:
            print(f"  ⚠️  Area ID {csv_area_id} ('{area_name}') not found — skipping {shop_name}")
            not_found += 1
            continue

        existing = db.query(Customer).filter_by(shop_name=shop_name).first()
        if existing:
            skipped += 1
            continue

        db.add(Customer(
            shop_name=shop_name,
            area_id=area.id,
            credit_limit=credit_limit,
            opening_balance=0.00,
            outstanding_balance=0.00,
            is_active=is_active,
        ))
        created += 1

    db.commit()
    print(f"  Customers: {created} created, {skipped} skipped, {not_found} area not found")


def seed_categories(db):
    from app.modules.products.model import ProductCategory, ProductGroup
    from scripts.catalog_data import CATEGORIES

    created = 0
    skipped = 0
    for code, name, group, hsn_code, gst_rate, size_range in CATEGORIES:
        existing = db.query(ProductCategory).filter_by(code=code).first()
        if existing:
            skipped += 1
            continue
        category = ProductCategory(
            code=code,
            name=name,
            group=ProductGroup(group),
            hsn_code=hsn_code,
            gst_rate=gst_rate,
            size_range=size_range,
        )
        db.add(category)
        created += 1
    db.commit()
    print(f"  Categories: {created} created, {skipped} skipped")


def seed_products_and_inventory(db):
    from app.modules.products.model import Product, ProductCategory, ProductGroup
    from app.modules.inventory.model import Inventory
    from app.modules.orders.model import OrderItem
    from app.modules.invoices.model import InvoiceItem
    from app.modules.credit_notes.model import CreditNoteItem
    from app.modules.debit_notes.model import DebitNoteItem
    from scripts.catalog_data import PRODUCTS_AND_INVENTORY

    all_categories = {c.code: c for c in db.query(ProductCategory).all()}

    synced_product_ids = set()
    prod_created = 0
    prod_updated = 0
    inv_created = 0

    for (
        cat_code,
        group,
        shade_name,
        shade_code,
        variant_code,
        variant_name,
        size,
        unit,
        mrp,
        dealer_price,
        pcs_per_carton,
        reorder_level,
        is_active,
        qty
    ) in PRODUCTS_AND_INVENTORY:
        category = all_categories.get(cat_code)
        if not category:
            continue

        query = db.query(Product).filter_by(category_id=category.id, size=size)
        if group == "shaded":
            query = query.filter_by(shade_name=shade_name or None, shade_code=shade_code or None)
        else:
            query = query.filter_by(variant_code=variant_code or None, variant_name=variant_name or None)

        product = query.first()
        if not product:
            product = Product(
                category_id=category.id,
                product_type=ProductGroup(group),
                shade_name=shade_name or None,
                shade_code=shade_code or None,
                variant_code=variant_code or None,
                variant_name=variant_name or None,
                size=size,
                unit=unit,
                mrp=mrp,
                dealer_price=dealer_price,
                pcs_per_carton=pcs_per_carton,
                reorder_level=reorder_level,
                is_active=is_active,
            )
            db.add(product)
            db.flush()
            prod_created += 1
        else:
            product.is_active = is_active
            product.mrp = mrp
            if dealer_price is not None:
                product.dealer_price = dealer_price
            if pcs_per_carton is not None:
                product.pcs_per_carton = pcs_per_carton
            prod_updated += 1

        synced_product_ids.add(product.id)

        existing_inv = db.query(Inventory).filter_by(product_id=product.id).first()
        if not existing_inv:
            inv = Inventory(
                product_id=product.id,
                physical_qty=qty,
                reserved_qty=0,
                available_qty=qty
            )
            db.add(inv)
            inv_created += 1

    # Clean up obsolete or commented-out products
    used_pids = set(
        [oi.product_id for oi in db.query(OrderItem).all()] +
        [ii.product_id for ii in db.query(InvoiceItem).all()] +
        [cni.product_id for cni in db.query(CreditNoteItem).all()] +
        [dni.product_id for dni in db.query(DebitNoteItem).filter(DebitNoteItem.product_id.isnot(None)).all()]
    )

    all_db_products = db.query(Product).all()
    deleted_count = 0
    deactivated_count = 0

    for p in all_db_products:
        if p.id not in synced_product_ids:
            if p.id in used_pids:
                p.is_active = 0  # Soft deactivate if tied to previous invoices
                deactivated_count += 1
            else:
                db.query(Inventory).filter_by(product_id=p.id).delete()
                db.delete(p)
                deleted_count += 1

    db.commit()
    print(f"  Products: {prod_created} created, {prod_updated} updated, {deleted_count} removed, {deactivated_count} deactivated")
    print(f"  Inventory: {inv_created} created")


def seed_all():
    db = SessionLocal()
    try:
        print("\n  Seeding CM Enterprises data...")
        print("  " + "─" * 40)
        seed_routes(db)
        seed_areas(db)
        seed_users(db)
        seed_customers(db)
        seed_categories(db)
        seed_products_and_inventory(db)
        print("  " + "─" * 40)
        print("  ✅ All data seeded successfully!\n")
    except Exception as e:
        db.rollback()
        print(f"\n  ❌ Seed failed: {e}\n")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()