A
FINAL YEAR PROJECT ON
DEVELOPMENT OF A WEB-BASED TOOL FOR
CLASSIFICATION OF RICE LEAF DISEASES
BY
OYEKANMI OLUWADEMILADE TOSIN
MATRIC NO: IFT/18/6027
SUBMITTED TO:
DEPARTMENT OF INFORMATION TECHNOLOGY
SCHOOL OF COMPUTING
FEDERAL UNIVERSITY OF TECHNOLOGY, AKURE
SUPERVISED BY:
Mr. T. J. FATOKE
SEPTEMBER, 2024
i
CERTIFICATION
This is to certify that the research titled “Development of a Web-Based Tool for
Classification of Rice Leaf Diseases” was undertaken by OYEKANMI
OLUWADEMILADE TOSIN with matriculation number IFT/18/6027 following the
regulations governing the award of a bachelor's degree in the Department of
Information Technology of the School of Computing at Federal University of
Technology, Akure.
Oyekanmi Oluwademilade Tosin
Student
….……………………………………….
Signature/Date
Mr. T.J. Fatoke
Supervisor
….……………………………………….
Signature/Date
PROFESSOR B.M. KUBOYE
Head of Department
….……………………………………….
Signature/Date
ACKNOWLEDGEMENT
My deepest gratitude goes to Almighty God for sparing my life till this very moment
and for His immeasurable love, care, favour, protection, and guidance over me
throughout my stay in this university.
My sincere appreciation goes to my supervisor, Dr. T.J. Fatoke, for his assistance
throughout the course of the research, providing time out of his busy schedule to read
and make corrections. I also appreciate him for the ideas, words of encouragement,
and for being a great source of inspiration to me throughout the period of the research
work.
I would also like to express my appreciation to the Head of the Department, Prof. B.M.
Kuboye, for his support and teaching. My profound gratitude goes to the academic
staff in the department: Prof. (Mrs.) O.K. Boyinbode, Prof. (Mrs.) Daramola, Dr.
Olotu, Dr. (Mrs.) Akinbo, Dr. (Mrs.) Kinga, Dr. (Mrs.) Oyelade, Mr. Paul, Mr.
Madamidola and Miss. Tijesunimi, for their support, and teaching. Special thanks to
Dr. (Mrs.) Akinbo for her constant unwavering support and for showing me how
there’s no limit if you put your mind to it.
I would like to extend my heartfelt gratitude to my amazing parents, Pastor and Late
Pastor (Mrs.) Oyekanmi, my foster parents, Mr. and Mrs. Oyesola and my wonderful
siblings, Mrs Ibukunoluwa Macaulay, Mrs. Oluwakanyinsola Williams and their
respective husbands Mr. Mayowa Macaulay and Mr. Kolawole Williams. Your
unwavering support, love, and encouragement have been a constant source of strength
throughout my academic journey. To my siblings from another mother, Mr. Oyewale,
Miss Iyanuoluwa, Mr. Olubisi, Mr. Ibukun Taiwo, Mr Ajifolawe and his beautiful
wife (Mrs Adepeju) and my best friend, Oluwatobiloba, your care, kindness, and
financial support have meant the world to me. I am deeply grateful for everything you
have done.
I would like to extend a special gratitude to Titobioluwa Idunnu Adeniyi, whose
unwavering support and encouragement was a solid source of strength during this
period.
A special thanks also goes to the central executives of Emmanuel Generation of
MFMCF FUTA: Mojisola Ibidapo, Oluwaseyifunmi Akeredolu, Oluwatobi Oyesola,
ii
Inioluwa Olanrewaju, Ifeoluwa Adeleye and Ayodeji Akinola.
Lastly, I am truly grateful for the priceless friendships I formed during my time here,
which provided me with motivation and strength. Special appreciation goes to
Chelsea Adetoluwa Adetan, Oluwadamilare Ajayi, Jonathan Irhodia, Toluwalope
Aiyegbusi, Eniola Awopegba, Ifeoluwa Erinle, Oluwatelemi Adedeji, Oladimeji Dada,
Kolawole Oyenusi, Oluwatoba Salami and the entire 24th Generation Executives of
MFMCF FUTA. You have all been incredible blessings in my life, and I thank God
for bringing us together.
iii
DEDICATION
This project is dedicated to God, “Oromonisefayati”, the One who sends His children
and backs them up, the giver of life. I am grateful for His grace upon me and for
sustaining me throughout my undergraduate programme.
iv
ABSTRACT
The project titled "Development of a Web-Based Tool for Classification of Rice
Diseases" focuses on leveraging artificial intelligence (AI) and machine learning to
address the challenge of detecting and managing rice plant diseases. By using deep
learning models, particularly convolutional neural networks (CNNs) like VGG16, the
system aims to classify various rice leaf diseases such as brown spot, bacterial leaf
blight, tungro, and blast based on images uploaded to a web platform. The system is
designed to provide a more accessible, efficient, and accurate method for diagnosing
rice diseases, replacing the time-consuming and expertise-dependent manual
inspection process.
The VGG16 model achieved a validation accuracy of 94%, reflecting its high efficacy
in classifying rice diseases. Precision and recall scores of 0.91 and 0.89, respectively,
demonstrate its reliability, with low false positives and strong sensitivity in
identifying true disease cases. Through this innovation, the project intends to improve
early disease detection, reduce crop losses, and enhance agricultural productivity and
food security.
v
TABLE OF CONTENT
CERTIFICATION...........................................................................................................i
ACKNOWLEDGEMENT............................................................................................. ii
DEDICATION.............................................................................................................iiv
ABSTRACT................................................................................................................... v
LIST OF FIGURES.......................................................................................................ix
LIST OF TABLES........................................................................................................ ix
CHAPTER ONE ...........................................................................................................1
1.0 INTRODUCTION............................................................................................1
1.1 BACKGROUND OF STUDY..........................................................................2
1.2 RESEARCH MOTIVATION........................................................................... 3
1.3 OBJECTIVE..................................................................................................... 4
1.4 METHODOLOGY........................................................................................... 4
1.5 ORGANISATION OF PROJECT.................................................................... 5
CHAPTER TWO............................................................................................................6
2.0LITERATURE REVIEW.................................................................................. 6
2.1 PLANT PATHOLOGY...................................................................................6
2.1.1 PLANT DISEASE................................................................................. 6
2.1.2 PATHOGEN.......................................................................................... 6
2.1.3 SYMPTOM............................................................................................7
2.2 RICE DISEASES.............................................................................................7
2.2.1 BLAST................................................................................................... 7
2.2.2 TUNGRO............................................................................................... 8
2.2.3 BACTERIAL LEAF BLIGHT...............................................................8
2.2.4 BROWN SPOT...................................................................................... 8
2.3 WEB-BASED DIAGNOSTIC TOOL.............................................................. 9
2.4 ARTIFICIAL INTELLIGENCE.....................................................................10
2.4.1 TYPES OF ARTIFICIAL INTELLIGENCE.......................................10
2.5 MACHINE LEARNING.................................................................................14
2.5.1 TYPES OF MACHINE LEARNING...................................................14
2.5.1 SUPERVISED MACHINE LEARNING.............................................14
2.5.2 UNSUPERVISED MACHINE LEARNING.......................................17
2.6 NEURAL NETWORK................................................................................. 19
vi
2.7 DEEP LEARNING......................................................................................... 19
2.8 CONVOLUTIONAL NEURAL NETWORKS (CNNs)................................ 20
2.8.1 CNN MODELS FOR IMAGE CLASSIFICATION............................24
2.9 VGG16........................................................................................................... 26
2.10 REVIEW OF RELATED WORK.................................................................27
CHAPTER THREE...................................................................................................... 32
3.0 INTRODUCTION...........................................................................................32
3.1 SYSTEM DESIGN......................................................................................... 32
3.2 METHODOLOGY..........................................................................................32
3.3 SYSTEM FLOWCHART............................................................................... 34
3.3 DATA COLLECTION....................................................................................35
3.4 DATA PREPROCESSING.............................................................................35
3.4.1 DATA PREPROCESSING TECHNIQUES........................................36
3.4.2 DATA SIZE......................................................................................... 37
3.5 MODEL SELECTION....................................................................................38
3.6 MODEL TRAINING...................................................................................... 39
3.7 MODEL TESTING.........................................................................................39
3.8 EVALUATION...............................................................................................40
3.9 DEVELOPMENT ENVIRONMENT AND TOOLS..................................... 40
3.9.1 PYTHON PROGRAMMING LANGUAGE....................................... 41
3.9.2 DEEP LEARNING FRAMEWORK AND LIBRARY....................... 41
3.9.3 DATA PROCESSING AND VISUALIZATION................................42
3.9.4 GOOGLE COLAB DEVELOPMENT ENVIRONMENT.................. 43
3.10 MODEL PERFORMANCE EVALUATION CRITERIA............................44
CHAPTER FOUR........................................................................................................ 46
4.0 INTRODUCTION...........................................................................................46
4.1 SYSTEM SPECIFICATION.......................................................................... 46
4.2 CODE IMPLEMENTATION......................................................................... 46
4.3 LIBRARIES.................................................................................................... 47
4.4 GOOGLE COLAB..........................................................................................48
4.5 DATA READING...........................................................................................49
4.6 DISCUSSION OF RESULT...........................................................................51
CHAPTER FIVE.......................................................................................................... 59
5.1 CONCLUSION...............................................................................................59
vii
5.2 RECOMMENDATION.................................................................................. 59
REFERENCES............................................................................................................. 61
APPENDIX..................................................................................................................61
viii
LIST OF TABLES
Table 3.1: Data Collected and their Division ………………………………………..37
Table 4.1: Individual Result …………………………………………………………51
Table 4.2: Collective Result …………………………………………..……….……52
Table 4.3: Training Performance ……………………………………………………52
ix
LIST OF FIGURES
Figure 2.1 A Simple Classification Architecture of CNN ….……………………..…22
Figure 3.1 Methodology …………………………………….…………………….…32
Figure 3.2 System Flowchart ………………………………..………………………33
Figure 3.3 Directory Containing the Dataset on my Local Computer……………….34
Figure 4.1 Imported Libraries …………………………………………………….…47
Figure 4.2 Mounting Google Drive…………………………………………………..48
Figure 4.3: Image Preprocessing (1) ………………….…….………………………49
Figure 4.4: Image Preprocessing (2) …………………….….………………………49
Figure 4.5: Image Preprocessing (3) ………………………..………………………49
Figure 4.6: Confusion Matrix …………………………………………………….…51
Figure 4.7: Visualisation of Individual Result ………….……………………..…….52
Figure 4.8: Training Accuracy vs Validation Accuracy ……………………………..53
Figure 4.9: Training Loss vs Validation Loss…………………………………….….53
Figure 4.10 Homepage of the Website……………………..……………….………..54
Figure 4.11 Image Showing Bacterial Blight Prediction…………………………….54
Figure 4.12 Image Showing Leaf Blast Prediction……………………………….….55
Figure 4.13 Image Showing Brown Spot Prediction………………………………...55
Figure 4.14 Image Showing Tungro Prediction………………………………..…….56
Figure 4.15 Image Showing Healthy Prediction……………………………………..56
x
1
CHAPTER ONE
1.0 INTRODUCTION
With an increase in population, rapid increase in the demand for food will be
imminent and inevitable. Nigeria is expected to see about 26.5 million people facing
severe food insecurity in the year 2024, as disclosed by the Nigerian government and
its partners when the October 2023 Cadre Harmonisé report on food insecurity was
presented. (“26.5 million Nigerians Projected to be Food Insecure”, 2023).
After maize, rice has become the second most produced cereal globally with the
production reaching more than 510 million tons, with China producing over 211
million tons in 2022 alone (Shahbandeh, 2023). With Nigeria being the 11th largest
consumer of rice globally and rice being the third-most consumed staple food in
Nigeria (after maize and cassava), rice is now a main crop for food security as a result
of its increasing significance in the country. With rapid population growth, there is an
expectation that the demand for rice will increase and be sustained in the foreseeable
future. (“Rice Industry Review”, 2019)
However, rice plant disease decreases rice production by 10 percent to 15 percent
(Peng et al., 2009). In extreme cases, they may reduce yield by 40 percent to 50
percent or lead to a complete loss of production (Jiang et al., 2020). These rice plant
diseases can significantly lower productivity and quality, and so quick identification
and control are important for good production. To lessen the severity of rice diseases
and restore the previous production rate, early detection is crucial. (Uddin, Mahamood,
Ray, Pramanik, Alnajjar & Ahad, 2024)
Early identification of rice diseases is crucial to lessen their severity and restore their
normal production rate. Manual rice disease identification is frequently used to
diagnose a disease based on how it reveals itself, but this requires human observation.
For a large rice field, the cost, time, and effort that is involved in this particular
procedure are high, and expertise is needed to perform the activities involved.
Imagine a world where farmers and agricultural workers can quickly and accurately
detect and manage rice diseases using a mobile-device-integrated system. This
research proposal aims to develop a robust and accurate AI model that can diagnose
rice diseases based on images uploaded on the website.
The proposed system will provide a convenient and cost-effective method for
detecting and managing rice diseases, which can significantly impact crop yield and
2
quality. By evaluating the usability and effectiveness of the proposed system in real￾world settings, The aim is to improve rice production and reduce crop losses,
ultimately contributing to food security and sustainable agriculture.
1.1 BACKGROUND OF STUDY
Rice is one of the most crucial staple crops globally. It serves as a primary food
source for more than half of the entire world's population. Because of the dependence
on rice globally, diseased rice plant is not a matter to be taken with levity. Diseases of
rice plants can drastically reduce crop yield and even lead to complete loss of
production. Early detection can reduce the severity and help with efforts to establish
effective treatment and reduce the usage of pesticides (Uddin et al, 2024). However,
rice production faces significant challenges due to various biotic and abiotic stresses,
including diseases caused by fungi, bacteria, viruses, and other pathogens. These
diseases, if left unmanaged, can cause substantial yield losses, affecting food security
and economic stability in rice-growing regions. Rice leaf disease can affect yield and
quality by damaging the green layer from the leaves. The way to control these rice
diseases is to rapidly and precisely detect the disease type and then implement
appropriate corrective actions in a timely manner (Tejaswini, Singh, Ramchandani,
Rathore, & Janghel, 2022).
Traditional methods of diagnosing rice diseases rely heavily on visual inspection by
trained agronomists or pathologists, which can be time-consuming, labuor-intensive,
and subjective. Moreover, in many regions, access to expert diagnosis is limited,
leading to delays in disease identification and ineffective management strategies.
Therefore, there is an urgent need for innovative and accessible tools to enhance the
speed and accuracy of rice disease detection. To meet the demand of the ever
increasing population, technology has to be introduced in order to increase yield and
production (Habib & Nura, 2021).
Recent advancements in deep learning and mobile technology offer promising
solutions to this challenge. By leveraging the computational power of mobile devices
and the capabilities of artificial intelligence (AI), it is possible to develop portable,
user-friendly classification tools for farmers and agricultural workers. These tools can
empower users to quickly and accurately identify rice diseases in the field, enabling
timely interventions and improved management practices.
3
The emergence of mobile device-based applications for agricultural purposes has
already demonstrated significant potential in various aspects of crop management,
including pest and disease monitoring, soil analysis, and yield prediction. However,
the development of such applications for rice disease diagnosis remains relatively
under-explored, especially in the context of leveraging advanced AI techniques for
image recognition and classification.
Existing research in this domain has primarily focused on laboratory-based studies or
remote sensing approaches using specialized equipment, which may not be practical
or affordable for smallholder farmers in resource-limited settings. Additionally, while
some studies have explored the use of convolutional neural networks (CNNs) for rice
disease classification, there is still a need for robust and reliable models tailored
specifically for mobile device deployment.
The proposed research builds upon the existing literature and aims to address these
gaps by developing a web-based classification tool for rapid detection of rice diseases.
By harnessing the capabilities of deep learning algorithms and integrating them into a
user-friendly web application, this tool seeks to provide farmers with a cost-effective
and accessible solution for disease management. Through rigorous testing and
validation in real-world agricultural settings, the effectiveness and usability of the
proposed tool will be evaluated, with the ultimate goal of enhancing rice production
and ensuring food security for vulnerable populations.
1.2 RESEARCH MOTIVATION
The study by Priyanshi Singh et al. (2022) titled "Rice Leaf Disease Classification
Using Convolutional Neural Network (CNN)" aims to develop an automated deep
learning model to accurately predict fungal diseases affecting rice plants based on leaf
images. It focuses on detecting four specific types of diseased rice leaves (Hispa,
Brownspot, LeafBlast, and Healthy) using a dataset of 1600 images, with the goal of
enabling timely disease detection and treatment to preserve rice plant health and crop
yield. Motivated by the critical role of rice as a major global food crop, especially in
India, the study addresses the need for efficient disease detection methods due to the
susceptibility of rice plants to various diseases.
Despite its contributions, the study highlights limitations, such as the reliance on a
relatively small dataset and factors affecting model performance, suggesting future
4
research should explore larger datasets and real-world applicability. The ultimate aim
is to develop a web-based diagnostic tool for rapid and precise disease detection,
enhancing agricultural productivity and food security.
1.3 OBJECTIVE
1) Design a rice leaf disease classification system to enhance disease detection and
management.
2) Implement this system using the VGG16 deep learning model for image
classification.
3) Evaluate the developed system’s performance in accurately identifying rice leaf
diseases.
1.4 METHODOLOGY
This project combines meticulous data collecting, cutting-edge deep learning
techniques, systematic model creation, and thorough evaluation. This methodology
encapsulates a systematic approach to develop and deploy a deep learning-based
solution for rice disease diagnosis on mobile devices, emphasizing usability, accuracy,
and real-world application.
1) Dataset Acquisition: A diverse and comprehensive dataset consisting of high￾quality images depicting various rice diseases and healthy plants was curated.
This dataset was carefully selected to encompass a range of environmental
conditions and disease stages, ensuring robustness and generalizability.
2) Data Preprocessing: The collected images underwent meticulous preprocessing
to standardize their quality, resolution, and format. This crucial step involved
tasks such as resizing, cropping, and enhancing image contrast to optimize the
dataset for subsequent model training. By standardizing the dataset, we aimed to
minimize noise and variability, thereby enhancing the performance and accuracy
of our deep learning model.
3) Model Selection: For the image recognition task focused on rice disease
diagnosis, we chose a suitable deep learning architecture, specifically, a
convolutional neural network (CNN). CNNs are well-suited for such tasks due to
their ability to effectively extract features from images. Our selection process
5
emphasized architectures capable of real-time processing to align with the
computational constraints of mobile device platforms.
4) Model Training: We employed transfer learning techniques to train our selected
model using the preprocessed dataset. By leveraging pre-trained models trained
on large-scale image datasets, we adapted them to the specific task of rice disease
diagnosis. This approach allowed us to expedite training and improve model
performance.
5) Model Testing: In this phase, we rigorously evaluated the trained model's ability
to diagnose rice diseases using a separate test dataset and real-world scenarios.
The model's performance was assessed on the test set, which consisted of images
that had not been encountered during training. This evaluation aimed to
determine the model's accuracy and generalisation capabilities in identifying
various rice diseases.
6) Evaluation: This stage assesses the trained model's effectiveness in diagnosing
rice diseases using both the test dataset and real-world scenarios. The model's
performance is evaluated on the test set, which includes images the model has not
encountered during training.
1.5 ORGANISATION OF PROJECT
The rest of this project is organized as follows, Chapter 2 presents the overall
literature review on rice plant disease detection using different methodologies and
models. It also reviews related research works with their methodology, results and
limitations. Chapter 3 presents a deep dive into the design of the system, its
architecture, the flowchart showing the workflow and the model. Chapter 4 expatiates
on deep insight into the Implementation of the system that was developed. The
system was evaluated, and conclusions and recommendations were put in Chapter 5.
6
CHAPTER TWO
2.0 LITERATURE REVIEW
2.1 PLANT PATHOLOGY
Plant pathology (also phytopathology) is the study of diseases in plants that is caused
by pathogens and environment conditions. The agent causing it may be a fungus,
bacterium, virus or parasitic flowering plant (Suchita, Parwan, Hallan & Sood, 2023).
It is the scientific study of plant diseases, their causes, interactions, and management
strategies. It encompasses various aspects related to understanding, diagnosing,
preventing, and controlling diseases that affect plants, including crops like rice.
2.1.1 PLANT DISEASE
A plant disease is a physiological disorder or structural abnormality that is harmful to
a plant or its parts, reducing the plant's economic value. Plant disease is an
impairment of the normal state of a plant that interrupts or modifies its vital
functions (Shurtleff, Pelczar, Kelman, Pelczar, 2023). Plant diseases can be caused by
a range of factors, including infectious pathogens like fungi, bacteria, viruses, and
nematodes, as well as abiotic stresses like nutrient deficiencies, environmental
extremes, and chemical injuries. These diseases can manifest in various ways, such as
lesions, discolouration, stunted growth, wilting, and other visible symptoms that
indicate the plant is not functioning normally. Plant diseases are a natural part of the
ecosystem, but can become problematic when they affect crops and other
economically important plants on a large scale, leading to significant yield losses and
other negative impacts.
2.1.2 PATHOGEN
A pathogen is a micro-organism, such as a fungus, bacterium, virus, or nematode, that
causes disease in plants. Pathogens can infect and colonise plant tissues, disrupting
the plant's normal physiological processes and leading to the development of disease
symptoms. Plant pathogens cause severe loss in terms of economics and production in
the agriculture sector. So, the crucial step toward disease management under natural
field conditions is to appropriately detect the pathogen (Tewari & Sharma, 2019).
Pathogens employ various strategies to enter and infect their plant hosts, such as
7
penetrating through natural openings or wounds or using specialised structures like
appressoria to attach and breach the plant's defences. The ability of a pathogen to
cause disease, or how harmful it can be, can vary greatly between different strains or
types of the same species. Plant pathogens, which include viroids, viruses,
phytoplasmas, bacteria, and fungi, are responsible for major economic losses and are
becoming more common globally. These pathogens establish close relationships with
plants to tap into the resources they need for survival, growth, and reproduction
(Bosland & Barchenger, 2024).
2.1.3 SYMPTOM
A symptom is an observable change or abnormality in a plant that is caused by a
disease. Symptoms can include visible signs like lesions, discolouration, stunted
growth, wilting, and other alterations to the plant's appearance or function. Plant
diseases are categorized in different ways, sometimes based on the symptoms they
cause, like spots, blights, rusts, smuts, rots, and wilts. Other times, they’re grouped by
the plant organ they affect, like root diseases, stem diseases, or foliage diseases. They
can also be classified based on the specific plant they infect. (Teena Agrawal, 2018).
These symptoms are the plant's response to the disruption of its normal physiological
processes by the causal pathogen or abiotic factor. Symptoms can provide important
clues for diagnosing the underlying cause of a plant disease, as different pathogens or
stresses often produce characteristic symptom patterns.
2.2 RICE DISEASES
2.2.1 BLAST
Rice blast is one of the most devastating rice diseases globally, causing large yield
losses every year and is a threat to global rice security (Li et al., 2011). It is a
devastating fungal disease that is caused by Magnaporthe oryzae. It poses a
significant threat to global rice production. This fungal pathogen infects rice plants,
leading to symptoms such as leaf blast, node blast, collar rot, neck rot, and panicle
blast, characterized by lesions or greyish/brownish spots and the withering of leaves
(Chaiharn et al., 2020). The economic implications of rice blast are profound, with
considerable crop losses reported worldwide (Yokotani et al., 2014). The severity of
rice blast disease is exacerbated by the emergence of new pathogen races and the
increase in compatible fungal strains, highlighting the dynamic nature of this
agricultural challenge (Chung et al., 2022).
2.2.2 TUNGRO
Rice tungro disease, a significant threat to rice cultivation, is caused by a complex
interaction between two viruses, namely Rice tungro bacilliform virus (RTBV) and
Rice tungro spherical virus (RTSV) (Kannan, Saad, Talip, Baharum & Bunawan.,
2019). It is known to be one of the most economically important viral diseases of rice.
(Shahjahan, Imbe, Jalani & Othman, 2008). This disease, prevalent in South and
Southeast Asia, manifests through symptoms such as stunting of plants, yellow to
orange discolouration of leaves, and reduced tillering (Mirandilla, Yamashita,
Yoshimura, & Paringit, 2023). The economic impact of rice tungro disease is
substantial, leading to significant yield losses and posing challenges to sustainable
rice production in endemic regions (Kannan et al., 2019).
2.2.3 BACTERIAL LEAF BLIGHT
Bacterial leaf blight, caused by the bacterium Xanthomonas oryzae pv. oryzae,
manifests as lesions on rice leaves, ultimately reducing yields. It is often first noticed
in fields as brown areas about 3 to 4 feet in diameter (Sidhu, Davis, Falk, Nuñez &
Turini, 2024). Bacterial blight first shows up as water-soaked streaks starting from the
tips and edges of the leaves. These streaks grow larger and eventually release a milky
substance that dries into yellowish droplets. In the later stages, greyish-white lesions
form on the leaves, which then dry up and die. In seedlings, the leaves dry and wilt, a
condition known as "kresek." Infected seedlings are usually wiped out by bacterial
blight within two to three weeks, while adult plants may survive, but their yield and
quality suffer a lot. (Yen, 2024).
2.2.4 BROWN SPOT
Brown spot, a significant disease affecting rice crops, is primarily caused by the
Bipolaris oryzae fungus. This fungal infection manifests as brown lesions with
distinct characteristics such as a dark brown margin and a gray or tan centre, often
appearing oval to circular in shape and varying in size. The impact of brown spot on
rice plants is profound, leading to reduced photosynthesis, stunted growth, and
8
compromised grain quality and yield. Several factors contribute to the development
and spread of brown spot, including warm temperatures ranging from 20-30°C, high
humidity levels, poor soil fertility, and plant stress (Ning et al., 2014).
2.3 WEB-BASED DIAGNOSTIC TOOL
Web-based diagnostic tools have significantly impacted disease diagnosis in various
fields, including agriculture and healthcare. These tools leverage the power of the
internet to offer accessibility from different devices, enabling users to capture and
analyze data for accurate assessments (Chen et al., 2023). By incorporating artificial
intelligence algorithms, these web applications can provide precise diagnoses,
particularly advantageous in resource-limited settings where specialized hardware
may not be readily available (Aggarwal et al., 2022). The ease of access and cost￾effectiveness of these tools make them invaluable for agriculture, allowing for rapid
data collection, visualization, and transfer, which in turn facilitates timely disease
management (Ye et al., 2019).
The integration of AI in agriculture has indeed been a significant development,
focusing on enhancing agro-business by improving rice quality and disease protection
(Deng et al., 2023). These advancements are important for effective management of
disease and control, emphasizing the importance of early and accurate diagnosis in
agricultural practices (Mao & Zhang, 2021). These tools not only aid in disease
identification but also contribute to optimizing agricultural processes, such as early
pest and disease detection, thereby supporting sustainable agricultural practices
(Alsaeedi, 2023). Using deep learning (DL) and dynamic clustering strategies further
enhances how accurate and efficient disease diagnosis is, ensuring prompt and
effective management (Takahashi et al., 2021).
Moreover, artificial intelligence applications in agriculture extend beyond disease
diagnosis to encompass pest detection and nutrient deficiency identification (Mahibha
& Balasubramanian, 2023). These tools enable the early detection of agricultural
issues, allowing for quick interventions to mitigate crop losses and improve overall
productivity (Jartarkar, 2022). By utilizing advanced technologies like drones and the
Internet of Things (IoT), agricultural practices can be optimized, leading to better pest
and disease control sustainably (Zhong et al., 2023). Additionally, the automation of
agricultural processes through artificial intelligence tools enhances the efficiency of
9
disease identification and resource management in agricultural production (Tian,
2024).
2.4 ARTIFICIAL INTELLIGENCE
Artificial intelligence is basically the ability of a computer to do tasks we’d normally
expect from intelligent beings. It’s often used to describe efforts to build systems that
can think like humans, things like reasoning, understanding meaning, generalizing,
or learning from past experiences (Jack Copeland, 2024). Artificial intelligence (AI) is
all about creating computer systems that can handle tasks that used to need human
intelligence, like recognizing speech, making decisions, and spotting patterns. It’s a
broad term that covers a range of technologies, like machine learning, deep learning,
and natural language processing (Coursera Staff, 2024). AI is a general-purpose
technology with applications in various areas, including e-commerce, image
recognition, credit scoring, language translation, and decision-making. It's used a lot
in both academic research and industry.
2.4.1 TYPES OF ARTIFICIAL INTELLIGENCE
Artificial Intelligence can be categorised into four various aspects:
1. Narrow AI, General AI, Superintelligent AI
2. AI Based on Functionality
a) Reactive Machines
b) Limited Memory AI
c) Theory of Mind AI
3. AI Based on Learning Capabilities
a) Machine Learning
b) Deep Learning
c) Reinforcement Learning
4. AI Based on Application
a) Natural Language Processing
b) Computer Vision
c) Robotics
10
2.4.1.1 NARROW AI, GENERAL AI, SUPERINTELLIGENT AI
Artificial Narrow Intelligence (ANI), also referred to as weak AI, is the only type of
artificial intelligence that has been successfully realised to date ( Eban Escott, 2017). It
excels in specific tasks like facial recognition, voice assistants, and internet searches,
driven by natural language processing (NLP). Chatbots are examples of NLP-enabled
AI, facilitating natural communication.
Artificial General Intelligence (AGI), or strong AI, envisions machines capable of
complex human-like thinking and problem-solving. It aims to understand emotions,
beliefs, and thought processes of other systems, going beyond mere replication of
human cognition. Though, AGI hasn’t been accomplished yet, it has drawn the
attention of a lot of top tech companies including Microsoft, which invested a billion
dollars in AGI through the OpenAI venture (Vijay Kanade, 2022).
Artificial Super Intelligence (ASI) is the hypothetical stage of AI where it exceeds
human intelligence, becomes self-aware (Coursera Team, 2024). ASI envisions
machines capable of surpassing human cognitive abilities, raising significant
questions about their impact on humanity, including self-preservation and unknown
consequences (Escott, 2017).
2.4.1.2 REACTIVE MACHINES
Reactive machines are the simplest type of AI systems that respond immediately to
inputs. It doesn’t have the ability to store memories or past experiences for future
decisions (Sahota, 2022). Reactive systems analyse different situations and respond
accordingly. A well-known example is IBM's Deep Blue, which famously defeated
Garry Kasparov in chess.
2.4.1.3 LIMITED MEMORY AI
Limited memory AI, as opposed to reactive machines, have the ability to store
memories and past experiences for future decisions. They can look into past
experiences and monitor specific situatiions or objects over time (Coursera Staff,
2024). These AI systems can make informed and enhanced decisions by analysing past
data they have collected. Most current AI applications, ranging from chatbots and
virtual assistants to self-driving cars, are not outside this category.
11
2.4.1.4 THEORY OF MIND AI
This is a more advanced type of AI that is still in the works. Theory of Mind artificial
intelligence types has not been actualised yet.They are still in their early stages and
can be observed in applications like self-driving cars (Johnson, 2020). This would
involve understanding and remembering emotions, beliefs, and needs, and making
decisions based on that understanding. This type requires the machine to genuinely
comprehend humans.
2.4.1.5 MACHINE LEARNING
In the past decade, the terms “artificial intelligence” and “machine learning” have
gained popularity across various fields, particularly in information systems. However,
these two terms are often used inconsistently in both academia and industry, 
sometimes interchangeably and sometimes with distinct meanings (Kühl, Schemmer,
Goutier & Satzger, 2022). Machine learning-based artificial intelligence uses data to
provide insights for optimal analysis. It relies on past behaviours to identify patterns
and creates models that aid in predicting future behaviours and events (Nozari,
Ghahremani-Nahr & Szmelter-Jarosz, 2024).
2.4.1.6 DEEP LEARNING
Deep learning approaches have significantly improved in performance across various
applications, especially in security technologies, making them an excellent solution
for uncovering complex structures in high-dimensional data. Consequently, deep
learning (DL) has the potential to transform the world and enhance everyday life
through its automation capabilities and ability to learn from experience. Thus, DL
technology is highly relevant to artificial intelligence, machine learning, and data
science, particularly in today’s advanced analytics and intelligent computing (Sarker,
2021).
2.4.1.7 REINFORCEMENT LEARNING
Reinforcement learning is one of the most talked-about and contemplated topics in
artificial intelligence (AI), as it holds the potential to revolutionise many businesses.
Similar to how toddlers learn to walk by adjusting their actions based on their
12
experiences, like taking a smaller step after a broad one leads to a fall, machines
and software agents use reinforcement learning algorithms to determine the best
actions based on feedback from their environment (Marr, 2018).
2.4.1.8 NATURAL LANGUAGE PROCESSING
Natural Language Processing (NLP) is a subfield of artificial intelligence focused on
how computers interact with human language. NLP techniques enable machines to
understand, interpret, and generate human language, allowing for various applications
such as language translation, sentiment analysis, and chatbots (Merigan, 2023).
Essentially, natural language processing is the ability of a computer programme to
comprehend human language as it is spoken and written, known as natural language.
It has been a part of artificial intelligence (AI) for over 50 years and has its roots in
linguistics (Gillis, 2024).
2.4.1.9 COMPUTER VISION
Computer vision is a branch of AI that trains computers to capture and interpret
information from image and video data. It utilises artificial intelligence (AI) to enable
computers to extract meaningful data from visual inputs such as photographs and
videos. The insights gained from computer vision are then used to carry out
automated actions. Just as AI empowers computers to ‘think’, computer vision
enables them to ‘see’ (Ashtari, 2022).
2.4.1.10 ROBOTICS
Robotics is an engineering and computer science field that deals with the design,
building, and use of machines that can accomplish tasks that have been
preprogrammed without the need of extra human intervention. Fundamentally,
robotics is the application of technology to automate processes and improve their
efficiency and safety. If the goal of Artificial Intelligence is to replicate human brain
function through a series of computer programmes, its application in robotics focuses
on enabling these machines to make decisions based on the information they gather
from their surroundings. (“Uses and Applications of Artificial Intelligence in
Robotics”, 2023)
13
14
2.5 MACHINE LEARNING
Machine learning is a subset of artificial intelligence in which algorithms learn from
data and produce predictions or classifications without explicit programming. It is
critical in medical diagnostics because it allows computers to learn from data and
anticipate outcomes without explicit programming (Deo, 2015). Machine learning
models in medicine are trained on enormous datasets of patient information,
symptoms, and test results to find trends and deliver reliable diagnoses (Beam &
Kohane, 2018). These models can then be used with new patient data to generate
automated, data-driven diagnoses.
2.5.1 TYPES OF MACHINE LEARNING
Algorithms are the engines that power machine learning. In general, two major types
of machine learning algorithms are used today:
1) Supervised Machine Learning
2) Unsupervised Machine Learning.
2.5.1 SUPERVISED MACHINE LEARNING
The most prevalent type of machine learning algorithm is supervised. Supervised
learning involves training a machine on tagged data to produce the desired output.
The system then learns to anticipate the outcome of additional input data. Supervised
machine learning includes tasks like classification and regression, in which a data
scientist guides the algorithm to reach educated conclusions (Pruneski et al., 2022).
There are several types of supervised machine learning algorithms, including
classification and regression, which are commonly employed in disease prediction
and diagnostics (Uddin et al., 2019). In this model, a data scientist serves as a guide,
teaching the algorithm what conclusions it should draw. Just like a toddler learns to
identify fruits by memorising them from a picture book, supervised learning trains the
algorithm on a pre-labeled dataset with a preset output. There are different types of
supervised machine learning.
1) Classification
2) Regression
2.5.1.1 CLASSIFICATION
A classification problem in machine learning occurs when a model is used to
determine whether data belongs to a specific group or object class (Seldon, 2022).
Classification issues require algorithms to accurately categorise test data, such as
distinguishing between apples and oranges. Alternatively, in the real world,
supervised learning algorithms can identify spam in a distinct folder from your email
(Delua, 2021).
1. Binary Classification: In the context of machine learning, binary
classification involves models that can predict one of two class labels, such as
yes/no or true/false, and is commonly performed by algorithms like Logistic
Regression, Decision Trees, and Naïve Bayes. (Wu et al., 2007).
2. Multiclass Classification: Multiclass classification is when a model can apply
to more than one class label. It predicts among multiple classes (e.g.,
yes/no/maybe). It is commonly performed by algorithms like Random Forest, k￾Nearest Neighbors, Naive Bayes, Gradient Boosting, Random Forests.
(Awaysheh et al., 2016).
3. Random Forest: Random Forest (RF), also known as standard RF or
BriemanRF, is an ensemble learning method that predicts classification or
regression using the majority vote or average of the outputs of numerous decision
trees. Because of its simple and easy-to-understand nature, rapid training, and
good performance, it is frequently utilised in various domains, such as data
mining, computer vision, ecology, and bioinformatics (Chen, Junhao & Wang,
Xueli, 2023)
4. Support Vector Machines: Support Vector Machines (SVMs) are a strong
supervised learning method used for classification and regression. It works by
identifying the best hyperplane to split distinct classes in the feature space. SVM
is effective in high-dimensional domains, making it useful for a variety of
applications such as image classification, text classification, and regression.
Support Vector Machines are adaptable algorithms that excel in determining
optimal decision boundaries for classification and regression problems, giving a
strong tool for numerous applications, such as sales forecasting in regression
(Blessing, Elisha & Klaus, Hubert ,2023).
15
5. k-Nearest Neighbors: This is a straightforward and intuitive supervised
machine learning algorithm used for both classification and regression tasks. The
k-nearest neighbors (KNN) algorithm is a fundamental technique in machine
learning that operates based on the principle of calculating distances between data
points to determine classification or regression outcomes (Paramita, 2022). KNN
involves finding the closest neighbors in the training data to the data being
evaluated, typically based on a specified value of k, which represents the number
of nearest neighbors considered in the analysis (Paramita, 2022).
6. Logistic Regression: Logistic regression is a commonly used algorithm for
binary classification tasks. It is employed to predict the likelihood of an
observation that belongs to a specific class, such as yes/no or 0/1. The output of
logistic regression is a probability score ranging between 0 and 1, which is then
transformed into a binary decision based on a predefined threshold. This
algorithm is fundamental in machine learning and is particularly effective in
scenarios where the goal is to classify data into two distinct categories based on
input features (Olorunlambe et al., 2021).
Imagine you’re managing an e-commerce website, and you want to figure out if a
customer will make a purchase based on their browsing history, the time they
spend on the site, and their previous purchases. You can use logistic regression to
create a model that predicts the likelihood of a customer making a purchase. This
way, you can tailor your marketing efforts to target those who are most likely to
buy, improving your sales and customer satisfaction.
2.5.1.2 REGRESSION
Regression is a supervised learning method that employs an algorithm to identify the
relationship between dependent and independent variables. Regression models are
useful for forecasting numerical values based on several data points, such as sales
revenue estimates for a certain business (Ho & Wookey, 2020). Some popular
regression techniques include linear regression and logistic regression.
1. Linear Regression: Linear regression is a simple and extensively used
method for predicting a continuous outcome given one or more input variables. It
forecasts continuous values, such as property prices (Lin et al., 2020). Linear
regression is a statistical technique that predicts a continuous outcome using one
16
or more input variables. It is frequently used in a variety of disciplines, including
statistics, mathematics, and machine learning. The essence of linear regression is
to represent the connection between a numeric dependent variable and one or
more independent variables, designated as x. By fitting a linear equation to the
data, linear regression seeks to build a linear relationship that best explains the
correlation between the input variables and the continuous output. (Mislick &
Nussbaum 2015).
Imagine you work for a real estate agency, and your task is to predict house
prices based on different features such as square footage, number of bedrooms,
and location. You can use linear regression to build a model that estimates the
selling price of a house based on these factors.
2. Bayesian Linear Regression: Bayesian linear regression is a powerful tool
that allows for the incorporation of prior information on the coefficients and noise
in the model, enabling the priors to guide the estimation process when data is
limited or unreliable. By placing priors on the model parameters, Bayesian linear
regression provides a framework for making probabilistic predictions and
capturing uncertainty in the estimation process (Hahn & Carvalho, 2015). It is
particularly beneficial when dealing with limited data samples or when there is
uncertainty in the data distribution (Bai & Ghosh, 2018).
2.5.2 UNSUPERVISED MACHINE LEARNING
Unsupervised machine learning, characterized by its independent approach, avails
computers to identify processes that are not simple but complex and patterns without
persistent human guidance, relying on data without specific labels or defined outputs
(Willetts et al., 2019). Unsupervised machine learning involves training based on
unlabelled data or data without a specific, defined output. There are different types of
unsupervised machine learning
1) Clustering
2) Dimensional Reduction
3) Association
17
2.5.2.1 CLUSTERING
Clustering is the process of arranging data items into a specific number of categories
based on similarities (or discrepancies) between them. Clustering is a fundamental
unsupervised learning technique that involves categorising data points based on their
similarities or differences within the dataset. This process allows for the exploration
of patterns and structures within raw and unlabelled data, enabling the identification
of inherent relationships and groupings. Clustering serves as a valuable tool for
understanding trends, uncovering hidden patterns, and detecting anomalies within
datasets, making it an essential component of data analysis and machine learning
(Berkhin, 2006).
In the world of machine learning, clustering techniques play a vital role in uncovering
underlying structures within data. discuss representation learning for clustering
through consensus building, emphasizing the importance of maintaining clustering
performance in real-world scenarios with distribution shifts. By leveraging consensus￾based approaches, clustering models can adapt to varying data distributions and
enhance their robustness in handling complex datasets (Deshmukh et al., 2022). Some
popular clustering algorithms are K-means clustering, Gaussian Mixture Models
1) K-means clustering: It represents the number of clusters specified by the data
scientist. Clusters are determined by their distance from the centre of each
grouping. A greater cluster count indicates more granular categories, whereas a
lower cluster count indicates less granular groupings. This approach can detect
exclusive or overlapping clusters (Hui et al., 2020).
2) Gaussian Mixture Models: Gaussian Mixture Models are a type of
probabilistic clustering in which data points are grouped depending on the
likelihood that they belong to a specific grouping. In contrast to K-means
clustering, which employs distance from the cluster's centre, this approach maps
data points to each cluster based on probabilities in the data (Wallet & Hardisty,
2019).
2.5.2.2 DIMENSIONAL REDUCTION
Dimensionality reduction is a learning approach that is used when a dataset has too
many characteristics (or dimensions). It decreases the quantity of data inputs to a
tolerable or manageable level while maintaining the integrity of the data. This
18
19
technique is frequently employed in the preprocessing data stage, such as when
autoencoders reduce noise from visual data to improve image quality (Khalid and
Herbert-Hansen, 2018).
2.5.2.3 ASSOCIATION
Association is an unsupervised learning strategy that identifies correlations or
relationships between variables in a dataset. These methods are commonly used for
market basket analysis and recommendation engines, such as "Customers Who
Bought This Item Also Bought" suggestions. (Unsupervised Learning, Engati, n.d.).
2.6 NEURAL NETWORK
The overall system is based on artificial intelligence. Machine learning is a subset of
artificial intelligence. Deep learning is a subfield of machine learning, and neural
networks provide the foundation of deep learning algorithms. The number of node
layers, or depth, of neural networks distinguishes them from deep learning algorithms,
which require more than three.
A neural network is an artificial intelligence technology that trains computers to
analyse data similarly to the human brain. This machine learning approach uses
interconnected neurones in a layered structure, similar to the human brain. (What is a
neural network? - Artificial Neural Network Explained (AWS, n.d.).
It is made up of interconnected nodes (neurones) arranged in layers, with each
neurone processing input data and transmitting signals to other neurones. In medical
diagnostics, ANNs are used to extract complicated patterns and correlations from big
datasets, allowing for tasks such as disease classification, risk prediction, and
treatment outcome analysis. It has demonstrated great effectiveness in medical image
analysis, genomics, and personalised medicine, providing insights that typical
statistical methods may miss (Sarma & Vardhan, 2018).
2.7 DEEP LEARNING
Deep learning is a branch of machine learning that entails training deep neural
networks with numerous layers to extract complicated patterns and representations
from input. Alzubaidi et al. (2021) drew inspiration from the human brain's
information processing mechanisms. Deep learning is a subset of machine learning
techniques that replicate the structure and function of the human brain. Deep learning
algorithms use neural networks with numerous layers to identify detailed patterns and
relationships within data, resulting in very accurate predictions and classifications
(Olaoye & Potter, 2024). Deep learning models have demonstrated superior
performance in a variety of medical diagnostic tasks, including image analysis,
natural language processing, and predictive modelling. Deep learning has been used
in healthcare to interpret medical images, develop drugs, predict diseases, and design
personalised treatments. The capacity of deep learning models to autonomously
extract features from complex data has transformed medical diagnostics, allowing for
more precise, efficient, and personalised healthcare solutions.
2.8 CONVOLUTIONAL NEURAL NETWORKS (CNNs)
CNNs have transformed computer vision and are now widely used in image and video
analysis (Singla, 2024). CNNs are specialised artificial neural networks that analyse
and analyse visual input such as photos and movies. They use convolutional layers to
automatically extract hierarchical characteristics from images, allowing for tasks such
as image classification, segmentation, and anomaly detection. Their ability to learn
from massive amounts of picture data has resulted in much higher diagnostic accuracy
and speed.
In the realm of agricultural technology, Convolutional Neural Networks (CNNs) have
proved to be robust tools for identifying leaf diseases in crops like rice. These
advanced neural networks use convolutional layers to extract hierarchical information
from images, allowing for precise tasks like disease categorisation and anomaly
identification (Muslikh, 2023). By utilising transfer learning and frameworks like
faster R-CNN, CNNs have been successfully applied to real-time diagnosis of rice
leaf diseases, showcasing their effectiveness in agricultural settings (Bari et al., 2021).
The integration of deep convolutional neural networks with transfer learning
techniques has proven valuable in classifying rice plant diseases, demonstrating the
potential of these models in agricultural applications (Shrivastava et al., 2019).
The application of CNNs in rice leaf disease identification involves training the
network on annotated image datasets to recognize patterns associated with common
diseases like brown spot, leaf blight, tungro, and leaf blast. This training process
enables the CNN to accurately detect and classify diseases in new images of rice
20
leaves, facilitating early diagnosis and targeted interventions (Muslikh, 2023). The
integration of CNNs with mobile app enables farmers and agricultural professionals to
capture leaf images in the field and receive immediate feedback on disease presence,
enhancing decision-making and disease management strategies (Bari et al., 2021).
This rapid identification capability supports improved crop health and productivity by
enabling timely responses to disease outbreaks, ultimately contributing to sustainable
agriculture practices (Shrivastava et al., 2019).
The effectiveness of CNNs in disease detection extends beyond rice plants, with
applications in various crops and agricultural settings. By leveraging deep learning
techniques and advanced neural network architectures, CNNs have shown
commendable performance in identifying and classifying plant diseases, aiding
farmers in early detection and management of crop health issues (Zhou et al., 2019).
The integration of CNNs with transfer learning and clustering methods has enhanced
the speed and accuracy of disease detection processes, offering valuable insights for
sustainable agriculture and improved crop yield (Veeramreddy, 2024). The
adaptability of CNNs to different plant species and disease types underscores their
versatility and potential for revolutionizing agricultural practices worldwide.
Convolutional Neural Networks (CNNs) are composed of multiple layers, each with a
specific purpose, that work together to learn and extract meaningful features from the
input data. Let's take a closer look at the key types of layers commonly found in a
standard CNN architecture:
1. Input Layer: The input layer in a Convolutional Neural Network (CNN) is
crucial as it serves as the initial point of entry for data into the network,
particularly in tasks related to images like image recognition or classification.
This layer represents the pixel values of the image, allowing for the examination
of individual pixels that make up the picture (Johnson & Zhang, 2015). CNNs
leverage the internal structure of data, especially the 2D structure of image data,
through convolution layers where each computation unit responds to a small
region of the input data (Johnson & Zhang, 2015). This structured processing is
essential for CNNs to extract meaningful features from images and other data
types.
2. Convolutional Layer: Convolutional layers uses learned filters to extract
features like edges and textures crucial for recognizing complex visual patterns
(Chen, 2023). the Convolutional Layer in a CNN hierarchically processes inputs
21
through sets of layers that perform convolution, thresholding, and pooling
operations (Tamura, 2024). This process involves convolving the input data with
filters to generate feature representations, followed by non-linearity,
normalization, and pooling layers to further refine the extracted features.
3. Activation Layer (ReLU): The Rectified Linear Unit (ReLU) is an important
component in Convolutional Neural Networks (CNNs), providing non-linearity
after convolution and enabling the network to learn complex relationships within
the data (Nanni et al., 2022). ReLU is favoured in CNN architectures for its
simplicity and effectiveness in enhancing model expressiveness (Nanni et al.,
2022). This activation function acts as a catalyst for creativity within the network,
aiding in deciphering intricate data relationships, similar to highlighting key
details in a story to improve comprehension (Nanni et al., 2022). Research has
over and over again shown the superior performance of ReLU as opposed to
other activation functions in tasks like image segmentation and classification (Ma
et al., 2022). ReLU has significantly enhanced CNN performance, particularly in
feature extraction tasks, due to its efficient introduction of non-linearity (Ali et al.,
2020).
Fig 2.1: A SIMPLE CLASSIFICATION ARCHITECTURE OF CNN. From: M.A. Jayaram.
(2024). AI and applications in civil engineering: Module 5: Computer vision.
4. Pooling Layer: Pooling layers, such as MaxPooling and AveragePooling, are
essential components in Convolutional Neural Networks (CNNs) for reducing the
22
size of feature maps from convolutional layers and focusing on crucial features
(Rashid et al., 2021). MaxPooling selects the highest value from a group,
emphasizing important features while discarding less significant ones (Rashid et
al., 2021). This process is analogous to summarizing a long story into key points,
highlighting critical aspects, similar to selecting the most exciting parts of a
movie (Rashid et al., 2021). Pooling layers are crucial for dimensionality
reduction and feature selection in CNNs. By utilizing operations like MaxPooling
and AveragePooling, these layers help summarize and extract key information
from feature maps, facilitating effective downstream processing and decision￾making (Sari et al., 2021). The combination of pooling techniques, such as
MaxPooling and AveragePooling, has been demonstrated to offer more
comprehensive statistical information to higher-level neural networks, thereby
enhancing the overall performance of image recognition tasks (Zhang et al., 2016).
5. Fully Connected (Dense) Layer: Fully connected layers are a key component of
Convolutional Neural Networks (CNNs), linking all the neurons in one layer to
all the neurons in the next, typically positioned towards the network's end. These
layers are crucial for transforming extracted features that have been learned by
earlier layers into predictions or class probabilities, akin to connecting the dots in
a puzzle to make a final decision, much like combining different clues to solve a
mystery (Saleem et al., 2022). Fully connected layers consolidate the extracted
features from preceding layers, thereby enabling the network to make informed
decisions based on the learned representations.
6. Dropout Layer: Dropout layers are a crucial component in neural networks
aimed at preventing overfitting by deactivating a portion of input units randomly
during training. This process encourages the network to learn more generalized
features, thereby enhancing its robustness and overall performance (Liu et al.,
2023). Dropout is a widely accepted technique in neural networks for mitigating
overfitting by randomly deactivating a percentage of neurons during training
epochs (Liu et al., 2023). The introduction of randomness through dropout layers
compels tthr learning of more robust and generalized features by the model,
resulting in enhanced performance on unseen data (Liu et al., 2023).
7. Batch Normalization Layer: Batch Normalization (BN) is a crucial technique in
deep learning that enhances training processes by standardizing inputs through
normalization, scaling, and shifting operations (Ioffe, 2015). By centering and
23
scaling activations within mini-batches, BN accelerates the training of deep
models, which leads to faster convergence and improved efficiency during the
learning process (Huangi et al., 2018). This normalization method allows for the
use of higher learning rates and mitigates the need for meticulous initialization,
contributing to the overall effectiveness of neural network training (Nurhaida et
al., 2020).
8. Flatten Layer: The Flatten layer in neural networks is a crucial component that
converts multi-dimensional feature maps into one-dimensional vectors, preparing
the data to be inputted into fully connected layers commonly used in
classification tasks (Hu, 2023). This transformation simplifies the information for
the network to comprehend, acting as a bridge between the convolutional layers
that extract features and the fully connected layers that make predictions based on
these features (Hu, 2023). The Flatten layer optimizes the performance and
efficiency of neural networks by reducing the dimensionality of feature maps and
converting them into a linear format.
9. Upsampling Layer: Upsampling is a crucial technique in deep learning,
commonly utilized in tasks such as image segmentation to enhance the spatial
resolution of feature maps and reconstruct finer details lost during downsampling
(Fan, 2023). By improving the quality of generated images or segmented regions,
upsampling plays a vital role in enhancing the accuracy and visual fidelity of the
output (Fan, 2023). This process is analogous to zooming in on a picture to reveal
more intricate details, thereby enhancing the quality of information and enabling
detailed observations in various applications (Fan, 2023).
2.8.1 CNN MODELS FOR IMAGE CLASSIFICATION
1. VGGNet (2014): VGGNet, is known for its depth, utilizing 16 or 19 layers of
small 3x3 convolution filters. It was developed at the University of Oxford by the
Visual Geometry Group. Despite its large number of parameters, its simplicity
and uniform architecture make it easy to implement and modify. VGGNet is ideal
for projects where high accuracy is crucial, and computational resources are
abundant, such as high-resolution image classification tasks.
2. ResNet (Residual Networks):
24
Residual networks, particularly ResNet, have significantly impacted the deep
learning field by effectively addressing the issues that are associated with training
very deep neural networks. ResNet, introduced by in 2016 (He et al., 2016; , is
renowned for its innovative approach of incorporating residual connections
between layers to mitigate the vanishing gradient problem (Pratama, 2023). This
design feature allows ResNet to learn residual functions with respect to the layer
inputs, facilitating the optimization and training of deeper models (He et al., 2016).
The architecture of ResNet is structured around residual blocks, each containing
two convolutional layers and a shortcut connection that skips one or more layers
(Xu et al., 2017). This design aids in the flow of gradients during backpropagation,
enhancing the network's learning efficiency (Pratama, 2023). The inclusion of
residual connections enables direct gradient propagation, effectively addressing
the vanishing gradient issue commonly encountered in deep network training
(Pratama, 2023).
3. Inception-v3 (2015): Inception-v3, an improved version of GoogLeNet, employs
factorized convolutions, asymmetric convolutions, and auxiliary classifiers to
reduce the number of parameters while maintaining performance. This model is
suitable for projects requiring efficient computation without compromising
accuracy, such as mobile and embedded vision applications.
4. MobileNet (2017): MobileNet, developed by Google, focuses on efficient
computation using depthwise separable convolutions, making it highly suitable
for mobile and embedded devices. MobileNetV2 introduced linear bottlenecks
and inverted residuals for further optimization. This model is perfect for projects
requiring real-time image classification on devices with limited computational
power, such as mobile apps and IoT devices.
5. EfficientNet (2019): EfficientNet, developed by Google AI, uses a compound
scaling method to balance the depth, width, and resolution of the network, to
achieve state-of-the-art performance with fewer parameters. EfficientNet is
suitable for a wide range of applications requiring both high accuracy and
computational efficiency, such as cloud-based image classification services and
large-scale image recognition projects.
25
26
2.9 VGG16
The VGG16 architecture was developed by the Visual Geometry Group at the
University of Oxford. It is a prominent deep learning model widely used for the task
of classifying images. Introduced in 2014, VGG16 is known for its deep architecture,
consisting of 16 layers with learnable weights, primarily convolutional layers
followed by fully connected layers. This architecture has gained remarkable attention
due to its ability to extract rich feature representations from images, making it suitable
for various applications, including object detection.
One of the notable aspects of VGG16 is its use of small convolutional filters (3x3)
stacked on top of each other, which allows the network learn complex patterns and
hierarchies in the data while maintaining a manageable number of parameters. This
design choice contributes to the model's effectiveness in capturing fine details in
images, which is particularly beneficial in tasks requiring high accuracy, such as
diagnosing diseases from medical images (Montaha et al., 2021). For instance, in a
study evaluating breast cancer diagnosis from mammography images, VGG16 was
fine-tuned to achieve high accuracy, demonstrating its applicability in medical image
classification (Montaha et al., 2021).
The transfer learning approach is often employed with VGG16, leveraging the pre￾trained weights obtained from training on the ImageNet dataset. This technique allows
researchers to adapt the model to new tasks with limited data, significantly reducing
training time and improving performance (Banerjee & Sparks, 2022). For example, in
a study focused on weld defect classification, VGG16 was utilized with transfer
learning to achieve an impressive accuracy of 90% (Kumaresan et al., 2023). This
adaptability makes VGG16 a popular choice among practitioners and researchers in
various fields.
The VGG16 architecture has been effectively utilized for rice leaf disease
classification, demonstrating its capability to accurately identify various diseases
affecting rice plants. VGG16, known for its deep architecture and use of small
convolutional filters, has been adapted in several studies to enhance the accuracy of
disease detection in rice leaves. This model's capacity to extract detailed features from
images makes it particularly suitable for agricultural applications, where precise
identification of plant diseases is important for effective crop management.
Recent research has highlighted the effectiveness of VGG16 in classifying rice leaf
diseases. For instance, a study by Nagila & Mishra (2023) employed VGG16 as a pre￾trained transfer learning model to classify plant leaf diseases, including those
affecting rice. The authors demonstrated that VGG16 could effectively distinguish
between healthy and diseased leaves, showcasing its robustness in agricultural
contexts. Similarly, in the work by (Aggarwal et al., 2023), VGG16 was utilized for
rice leaf disease classification, contributing to the development of automated systems
for disease identification in crops.
2.10 REVIEW OF RELATED WORK
Yang Lu et al, 2017 study aimed to introduce a lightweight deep Convolutional Neural
Network (CNN) method for the detection of rice leaf diseases. The researchers
recognized the importance of accurate and efficient rice disease diagnosis, as it is
crucial for maintaining high agricultural productivity and food security. They
gathered a comprehensive dataset of rice leaf images, including both healthy and
diseased samples, to train and evaluate their deep learning model. Employing deep
CNN architectures known for their performance in image recognition tasks, they
aimed to surpass the accuracy and efficiency of existing methods. While the study
achieved significant advancements, a notable limitation was the absence of a fully
automated system for recognizing a large-scale variety of rice leaf diseases,
suggesting the need for future work to enhance the model's capabilities for broader
disease recognition.
Sharada P. Mohanty et al.’s, 2016 study aimed to showcase the feasibility of using
deep learning models for smartphone-assisted crop disease diagnosis on a global scale.
Emphasizing the significance of early and accurate disease detection in agriculture,
the researchers trained deep Convolutional Neural Network (CNN) models on large￾scale image datasets. Their goal was to develop a system deployable on smartphones
for real-time crop disease diagnosis. While the study demonstrated the potential of
deep learning in this domain, a limitation was the controlled conditions under which
the dataset was collected. This limitation highlighted the need for future research to
diversify datasets to better represent real-world scenarios and enhance model
robustness and generalization.
27
Priyanshi Singh, Monica Ramchandani, Yogesh Kumar, and Rekh Janghel, 2022
conducted a study with the objective of developing an automated system for detecting
fungal diseases in rice plants. Recognizing the detrimental impact of fungal diseases
on rice production, the researchers aimed to address the challenges associated with
accurate disease diagnosis. Their methodology involved utilizing a dataset of images
depicting diseased rice leaves for training and detection purposes. Despite
demonstrating promising results, the study highlighted challenges related to achieving
high accuracy in disease detection. This limitation underscores the importance of
further research to expand the dataset, explore advanced deep learning architectures,
and address practical implementation challenges for improved disease diagnosis
systems.
Jayme Garcia Arnal Barbedo's 2018 study provided a detailed analysis of factors
influencing the performance of tools for plant disease recognition. Utilizing
Convolutional Neural Networks (CNNs) for classifying plant diseases based on image
data, the study delved into the challenges of obtaining diverse training data from
different geographic areas and cultivation conditions. The research aimed to improve
the efficiency and accuracy of disease recognition tools. However, a significant
challenge identified was the need for a wide variety of training data, reflecting
different conditions and areas. This challenge underscores the importance of
comprehensive datasets for robust and generalizable model development in plant
disease recognition.
Sanjay et al.'s 2022 study focused on detecting and classifying diseases in rice plants
using deep learning techniques. Leveraging the Rice Leaf Disease Dataset from the
UCI Machine Learning Repository, the researchers implemented a Residual Neural
Network for disease classification. While the study showcased the potential of image￾based disease detection, a limitation was the reliance solely on image data, which may
not capture all aspects of plant health accurately. This limitation highlights the need
for future research to explore integrating additional data sources for more
comprehensive disease detection capabilities, addressing the complexities of real￾world agricultural scenarios.
Gursewak Singh et al.'s 2023 study proposed an approach for diagnosing rice leaf
diseases using a deconvolutional neural network, leveraging an AlexNet model pre￾trained on ImageNet for classification. The project aimed to address challenges
hindering computer-assisted rice leaf disease diagnosis. While showcasing the
28
potential of deep learning techniques in disease diagnosis, the study emphasized the
need for robust and accurate models capable of handling real-world complexities.
This highlights the importance of further research to enhance the capabilities of
computer-assisted rice disease diagnosis systems for practical agricultural applications.
Yan Wei et al.'s 2023 study aimed to develop a fast and accurate automatic classifier
for identifying rice diseases using deep learning techniques. With a dataset of 500
images featuring three common rice diseases, the researchers trained a Convolutional
Neural Network (CNN) model using transfer learning with VGG-16, achieving an
impressive 95.6% accuracy. The study demonstrated the effectiveness of transfer
learning in improving disease classification accuracy. While showcasing promising
results, the study highlighted the potential of deep learning techniques in developing
efficient and reliable disease classifiers for practical agricultural use.
M.S Habib et al’s, 2021 study aimed to develop a smart agricultural solution to alert
farmers of different types of rice diseases via a mobile phone. Their methodology
involved image capture, pre-processing, segmentation, feature extraction, and
classification using a Convolutional Neural Network (CNN). While showcasing a
comprehensive approach to rice disease diagnosis, a key limitation highlighted was
the training time required for the Probabilistic Neural Network (PNN) classification
technique. This limitation underscores the importance of exploring alternative deep
learning architectures or optimization techniques to enhance the efficiency of disease
detection systems for practical agricultural applications.
Wan-jie Liang et al.'s 2019 study aimed to propose a novel rice blast recognition
method based on Convolutional Neural Networks (CNNs). Recognizing the
devastating impact of rice blast on rice production, the researchers established a
dataset of positive and negative samples for training and testing the CNN model.
While showcasing advancements in rice blast recognition, a limitation was the
absence of a dedicated image dataset for this specific research. This limitation
emphasizes the need for future work to expand datasets to improve model robustness
and generalization for accurate disease identification.
Kawcher Ahmed et al.'s 2019 study aimed to develop a system for identifying rice leaf
diseases using machine learning methods. Acknowledging the significance of prompt
disease identification in rice farming, the researchers employed high-quality images
of diseased rice leaves to train different machine learning models. The investigation
offered valuable perspectives on the potential of machine learning approaches for
29
detecting rice leaf diseases. Nevertheless, the research emphasized the necessity for
additional studies to overcome obstacles associated with real-world application and
the practical execution of disease detection systems in agricultural environments.
The research by Latif et al, 2022 seeks to address the substantial effects of diseases on
rice crops, which can cause significant yield reductions ranging from 20% to 40%.
These challenges make it difficult for farmers to visually detect diseases early,
particularly across extensive farmlands, potentially leading to higher production costs
and elevated consumer prices. By integrating machine learning algorithms, drones,
and IoT, the research offers a solution for early detection and classification of rice
diseases. The primary goal is to introduce a Deep Convolutional Neural Network
(DCNN) approach based on transfer learning for accurate identification and
classification of rice leaf diseases, focusing on six specific categories: healthy, narrow
brown spot, leaf scald, leaf blast, brown spot, and bacterial leaf blight. The aim is to
achieve high precision through a modified VGG19-based transfer learning technique.
However, the study's limitations include the specificity of the dataset potentially
affecting the generalizability of results, the impact of environmental factors and image
quality on the method’s effectiveness, and the substantial computational resources
required for training and deploying the model, which may present challenges in
resource-limited contexts.
The research by Ciresan et al. (2011) presents a high-performance Convolutional
Neural Network (CNN) implementation on GPUs, enabling efficient training of deep
hierarchical architectures for image classification. This approach achieves state-of￾the-art results on benchmarks like NORB, CIFAR10, and MNIST. The paper
addresses the need for fast, fully parameterisable GPU implementations of CNN
variants and demonstrates that deep neural networks trained by back-propagation
outperform shallower models, showcasing rapid learning capabilities. While it
highlights efficiency gains, it may not thoroughly discuss challenges or drawbacks of
scaling CNNs on GPUs or scenarios where the approach might be less effective. The
study reveals a fast GPU implementation of CNNs that significantly reduces test error
rates on the MNIST dataset after just a few epochs through efficient neuron delta
computations in various network layers.
The primary objective of the paper by Mehwish et al, 2022 is to propose a deep
learning solution for automated detection of three common rice diseases: leaf smut,
bacterial leaf blight, and brown spot. Using VGGNet CNN pre-trained on the
30
Imagenet dataset for transfer learning, the model achieved a 97.22% mean accuracy in
5-fold cross-validation. The study highlights the need for automation due to the
labour-intensive nature of manual disease diagnosis. While the framework shows high
accuracy, it doesn't address challenges like real-world implementation or scalability,
nor does it explicitly discuss any limitations encountered.
31
CHAPTER THREE
3.0 INTRODUCTION
This chapter provides information on the description of the approach, strategy, design,
architecture used to carry out this research. The tools and techniques used are also
stated.
3.1 SYSTEM DESIGN
The design proposed for this rice leaf disease classification project was decided after
careful consideration of the task requirements and the complexities of the data. This
process involved identifying the key features necessary for accurately distinguishing
between healthy and diseased rice leaves, such as the unique visual patterns and
textures associated with each disease. Given the nature of the image data, a
Convolutional Neural Network (CNN) was determined to be the most suitable
approach, with VGG16 specifically chosen for its effectiveness in handling intricate
image classifications.
3.2 METHODOLOGY
The overall strategy was to divide the implementation into distinct phases: starting
with the data collection and preparation/preprocessing phase, followed by the model
selection and training phase using VGG16, and concluding with the model testing and
evaluation phase to check the model's performance and accuracy in real-world
scenarios.
32
Figure 3.1: Architecture of the System
33
3.3 SYSTEM FLOWCHART
Figure 3.2: System Flowchart
34
3.3 DATA COLLECTION
To train and test the model effectively, a substantial and well-curated image dataset is
essential. In the development of the rice leaf disease classification system, the
foundation lies in the meticulous process of data collection. Kaggle provided the
necessary dataset, focusing on four common rice leaf diseases: brown spot, leaf blight,
tungro, and leaf blast. The goal was to obtain a dataset that was both large enough to
ensure robust training and manageable enough for efficient testing.
Figure 3.3: Directory Containing the Dataset on my Local Computer
The dataset was carefully split into training and validation sets, using a 80:20 ratio;
with 80% of the data dedicated to training and the remaining 20% reserved for
validation. The training set, consisting of a significant number of images, forms the
core of the machine learning model's ability to recognise the distinct visual patterns
associated with each disease. The validation set plays a crucial role during the training
process; it is used to tune the model’s hyper-parameters and monitor its performance
on unseen data. This helps in detecting overfitting, ensuring that the model is able to
generalise well to new, unseen images. By evaluating how well the model performs
on the validation set at each training epoch, adjustments can be made to improve the
accuracy and robustness before the final testing phase. Each image is meticulously
labelled according to the disease it represents, as accurate labelling is essential for the
model to effectively learn and differentiate between the diseases
3.4 DATA PREPROCESSING
Before feeding the images into the model, the data must be preprocessed to ensure
uniformity, improve data quality, and enhance the model’s learning efficiency. This
35
36
involves resizing all images to a consistent dimension, enabling the model to process
them efficiently. Normalization is also performed, scaling the pixel values of the
images to a standardized range, which reduces computational complexity and
accelerates model training, the images in this dataset were resized to 150x150 pixels.
Additionally, data augmentation techniques, such as rotation, the images were rotated
by up to 30 degrees, flipping, in this dataset, the images are randomly flipped
horizontally, zooming, the images are randomly zoomed by up to 20%, and cropping,
are applied to artificially broaden the dataset, making the model more robust to
variations. Noise reduction methods, such as filtering, are also used to minimize noise
in the images, improving the model's focus on the critical features of the plants.
3.4.1 DATA PREPROCESSING TECHNIQUES
Since this study focuses on images (specifically leaf images), the preprocessing
techniques applied include: loading and resizing, normalization, colour space
conversion, and data augmentation, particularly for multi-class datasets.
i. Resizing: During this phase, images from the dataset are loaded into a format
that deep learning frameworks can process. They are then resized to ensure
uniformity in dimensions, as neural networks require fixed-size inputs to
function correctly.
Image can be represented mathematically as;
(1)
This model is used for loading images, where H is the height of the image and
W is the width of the image
To resize an image I of size H x W to H’ x W’, the mathematical
representation is given as;
I’ = resize(I, (H’, W’)) (2)
ii. Normalization: In this stage, the pixel values of the images are scaled to a
range that is suitable for the network. Specifically, the pixel values, originally
37
ranging from 0 to 255, are normalized to between 0 and 1, which is more
suitable for the network.
For pixel value p in an image, The mathematical representation to derive
normalized pixel value p′is;
(3)
For [0, 255] to [0,1]:
(4)
Where p is the actual pixel value and p’ is the normalized pixel value
iii. Colour Space Conversion: in this step, the image was firstly converted to
greyscale to remove all RGB colours using the formula:
Igray =0.2989*R+0.5870*G+0.1140*B (Antoniadis,2024) (5)
The grayscale image was then convolve with a Gaussian kernel G to reduce
noise. This operation can be represented mathematically as:
(Misra & Wu, 2019) (6)
Where I(x,y) is the pixel intensity at coordinates (x,y) and G(i,j) is the
Gaussian kernel. Then contrast stretching will be applied to enhance the
contrast of the image.
3.4.2 DATA SIZE
The collected data was divided into training and validation dataset, facilitating the
training and evaluation of the models developed. The collected dataset was divided
using ratio 80:20, specifically, 80% of the collected data was allocated for training the
models, and 20% of the collected data was allocated for validation of the trained
model
The splitting of data set is done using the mathematical formula;
38
Dtraining= (7)
Dvalidation= (8)
For brown spot, bacteria blight, blast, tungro and healthy total dataset collected was
8,453 images, the dataset used for training was 7608 images, while dataset used for
validation was 845 images.
Table 3.1: Data Collected and their division. From: Kaggle
Dataset Bacterial
Blight
Blast Brown
Spot
Tungro Healthy Total
Training 1299 1393 1834 1046 1190 6763
Validation 325 348 458 262 298 1690
Total 1624 1741 2292 1308 1488 8453
3.5 MODEL SELECTION
This stage focuses on selecting a machine learning model architecture capable of
accurately classifying rice diseases based on the preprocessed images. It involves
evaluating various Convolutional Neural Network (CNN) architectures, such as
MobileNet, VGG16, ResNet, or custom models. Each model offers specific
advantages, like speed or accuracy, which may align with the project's requirements.
The computational resources available are also considered, as the chosen model must
operate efficiently on a smartphone. Lightweight models like MobileNet are often
preferred for mobile applications due to their balance between performance and
efficiency. Additionally, the possibility of using pre-trained models through transfer
learning is explored. These models, already trained on large image datasets, can be
fine-tuned on the rice disease dataset, expediting the training process and enhancing
accuracy.
3.6 MODEL TRAINING
This stage involves training the selected machine learning model, typically a
Convolutional Neural Network (CNN), to recognize and classify different rice
diseases using the preprocessed dataset. The process begins with setting up the model
architecture, including layers, activation functions, and loss functions. If transfer
learning is used, the model is initialized with weights from the pre-trained network.
The training data is fed into the model in batches, and its parameters are fine-tuned
using optimisation algorithms like stochastic gradient descent (SGD) or Adam, 
Adam was used here. The model learns by minimising the loss function, which shows
the gap, that is the difference between the predicted and actual labels. After each
training round (epoch), the model's performance is checked against a validation set to
track progress and spot overfitting, where it performs well on the training data but
struggles with new, unseen data. To get the best performance and avoid overfitting,
hyper-parameters like learning rate, batch size, and the number of epochs are adjusted.
Techniques like grid search or random search can be used to fine-tune everything.
3.7 MODEL TESTING
In this phase, the trained model undergoes a rigorous testing process to evaluate its
ability to accurately classify rice diseases. The model is tested using a separate dataset,
referred to as the test set, which includes images that were not part of the training or
validation datasets. This ensures that the assessment of the model's performance is
unbiased and reflective of its generalisation capabilities. The model processes these
test images, and its predictions are compared to the true labels to gauge its accuracy.
Various metrics are employed to quantify the model's performance, including
accuracy, precision, recall, and F1-score. A confusion matrix is also generated,
providing insights into how well the model distinguishes between different classes,
such as various rice diseases and healthy plants. This matrix highlights specific areas
where the model may struggle, facilitating targeted improvements.
To further validate the model's effectiveness, it is deployed on a smartphone and
tested with real-time images of rice plants in diverse environmental conditions. This
practical application is crucial to ascertain the model's robustness against variations in
image quality, lighting, and other factors present in field scenarios. Should the
model's performance not meet expectations during this testing phase, it may be
necessary to revisit earlier stages, such as data preprocessing or model selection, to
implement necessary adjustments. This iterative process could involve collecting
39
additional data, experimenting with alternative models, or fine-tuning hyper￾parameters to enhance overall performance.
3.8 EVALUATION
This stage assesses the trained model's effectiveness in diagnosing rice diseases using
both the test dataset and real-world scenarios. The model's performance is evaluated
on the test set, which includes images the model has not encountered during training.
Metrics such as accuracy, precision, recall, and F1-score are calculated to assess
performance. A confusion matrix is generated to analyse how well the model
distinguishes between different diseases and healthy plants, helping to identify any
specific classes where the model struggles. The model is then deployed on a
smartphone and tested with real-time images of rice plants. This step is critical to
ensure that the model performs effectively in the field, considering variations in
image quality, lighting, and other environmental factors. If the model underperforms,
earlier stages such as data preprocessing or model selection may need to be revisited
to make necessary adjustments. This iterative process may involve collecting
additional data, experimenting with different models, or further tuning hyper￾parameters.
3.9 DEVELOPMENT ENVIRONMENT AND TOOLS
In evaluating machine learning techniques for classifying rice leaf diseases, various
development environments, tools, and frameworks tailored to handle the complexities
of image data and deep learning models were employed. Listed below are the
essential tools and environments used in this project.
1. Programming Language: Python
2. Deep Learning Framework and Library: TensorFlow, Keras
3. Data Processing and Visualization: Pandas, NumPy, Matplotlib, Seaborn
4. Development Environment: Google Colab
3.9.1 PYTHON PROGRAMMING LANGUAGE
Python was selected as the primary, that is main programming language for this
project because of its versatility and the wide range of machine learning and deep
learning libraries it supports. Its simplicity and readability make it perfect for
40
developing complex machine learning models, allowing for quick prototyping and
iterative development. The large community around Python also means there’s plenty
of resources like tutorials, pre-built models, and documentation easily available. Plus,
Python's compatibility with different development environments and its seamless
integration with the other tools used in this project made it an obvious choice for
building the rice leaf disease classification pipeline.
3.9.2 DEEP LEARNING FRAMEWORK AND LIBRARY
3.9.2.1 TENSORFLOW
TensorFlow is a powerful open-source deep learning framework that was developed
by Google. It is designed to handle complex mathematical computations and is
particularly well-suited for building and training deep learning models. In this project,
TensorFlow was used as the foundation for implementing the Convolutional Neural
Network (CNN), specifically the VGG16 model, to classify rice leaf diseases.
TensorFlow’s flexibility makes it efficient in handling the large computational
resources needed to train deep models on big datasets, like those with high-resolution
images of rice leaves. Its ecosystem also includes tools like TensorBoard, which
played a key role in visualising the training process, tracking metrics like loss and
accuracy, and pinpointing areas where the model could be improved. TensorFlow's
ability to scale from CPUs to GPUs and TPUs made it indispensable for managing the
intensive computations involved in this project.
3.9.2.2 KERAS
Keras is a high-level deep learning API which runs on top of TensorFlow. It provides
a user-friendly interface that is used for building and training neural networks. Its
simplicity and modularity make it an ideal choice for rapid prototyping and
experimentation with different model architectures. In this project, Keras was used to
construct the CNN model for rice leaf disease classification, enabling easy definition
of layers, activation functions, and optimizers. Keras abstracts much of the
complexity of TensorFlow, allowing for a more straightforward and intuitive model￾building process. It also provides a range of pre-built layers and functions, making it
easier to implement sophisticated models like VGG16 with minimal code. Keras’s
41
support for a variety of backends and its extensive documentation made it an
accessible and effective tool for achieving the project's objectives.
3.9.3 DATA PROCESSING AND VISUALIZATION
3.9.3.1 NUMPY
NumPy is the core package for numerical computing in Python, offering support for
large, multi-dimensional arrays and matrices, along with a range of mathematical
functions to work with these arrays. In this project, NumPy was extensively used to
handle the pixel data of the images. It enabled tasks like resizing, normalising, and
augmenting images, which are crucial steps in preparing data for the CNN. NumPy’s
efficient array operations allowed for fast, memory-efficient processing of large
image datasets, making sure the data was in the correct format for TensorFlow and
Keras. Its seamless integration with other scientific computing tools and its
widespread use in the machine learning community made it a key part of the data
preprocessing workflow.
3.9.3.2 PANDAS
Pandas is a versatile data manipulation and analysis library for Python, widely used in
data science and machine learning projects. In this project, Pandas was essential for
managing and preprocessing the image metadata, such as labels and file paths,
ensuring that the data was organized and accessible for training the model. Pandas
excels at handling large datasets and offers powerful tools for filtering, grouping, and
aggregating data, which were crucial during the data preparation phase. For instance,
it was used to read and merge data from multiple sources, clean and format it, and
split it into training and testing sets. The ability to perform these tasks efficiently and
with minimal code made Pandas an invaluable asset in the preprocessing pipeline of
this project.
3.9.3.3 MATPLOTLIB
Matplotlib is a popular plotting library in Python, used to create static, animated, and
interactive visualisations. In this project, it was utilised to visualise the results and
track the progress of the model training process. Matplotlib was used to generate plots
42
like training and validation loss curves, accuracy graphs, and confusion matrices,
offering a visual overview of the model's performance over time. These visualisations
were key in diagnosing issues such as overfitting or underfitting and helped in making
informed decisions for fine-tuning the model. Matplotlib’s flexibility in customizing
plots and its ability to integrate seamlessly with Jupyter notebooks made it an ideal
tool for the project's data visualization needs
3.9.3.4 SEABORN
Seaborn is a data visualisation library in Python built on top of Matplotlib, known for
its ability to create attractive and informative statistical graphics. In this project,
Seaborn was used to enhance the visualizations created with Matplotlib, particularly
in displaying data distributions and relationships between variables. It provided more
aesthetically pleasing and interpretable plots, such as heatmaps and pair plots, which
were used to explore correlations in the dataset and visualize the model's confusion
matrix. Seaborn’s built-in themes and colour palettes made it easier to create visually
appealing charts that clearly communicated the results of the analysis. Its high-level
interface for creating informative statistical visuals made it an essential part of the
project's visualisation toolkit.
3.9.4 GOOGLE COLAB DEVELOPMENT ENVIRONMENT
Google Colab was chosen as the development environment for this project due to its
powerful cloud-based computing capabilities, which are particularly advantageous
when working with large datasets and computationally intensive models like VGG16.
Colab provides free access to GPUs, significantly accelerating the training process of
deep learning models. Moreover, its integration with Python and compatibility with
libraries like TensorFlow and Keras made it an ideal platform for running the
project’s experiments. The collaborative nature of Google Colab also allowed for easy
sharing of notebooks and results, enabling seamless collaboration and troubleshooting.
The environment's auto-save feature and version control further ensured that all work
was consistently backed up and could be revisited as needed.
43
44
3.10 MODEL PERFORMANCE EVALUATION CRITERIA
Evaluating model performance is a critical step in determining the effectiveness and
reliability of the chosen machine learning algorithms in predicting food production
yield. Various evaluation mechanisms are employed to assess and compare the
models' performance based on their ability to correctly predict food production yield
using the dataset. Information about all the metrics discussed in the subsequent
section are based on Grandini et al. (2020)
Four essential measures will be used to evaluate the models' performance:
1. Precision
2. Accuracy
3. Recall
4. F1-score
i. Precision focuses on the accuracy of positive predictions, representing the
proportion of true positive predictions among all positive predictions made by the
model.
* 100 (10)
Where;
TP: When the model correctly identifies a positive outcome, such as detecting
a diseased rice plant as diseased
FP: When the model incorrectly identifies a healthy rice plant as diseased.
ii. Accuracy quantifies the overall correctness of the model's predictions by
measuring the ratio of correctly classified instances to the total number of
instances.
(11)
Where;
TP: When the model correctly identifies a positive outcome, such as detecting
a diseased rice plant as diseased
45
FP: When the model incorrectly identifies a healthy rice plant as diseased.
TN: When the model accurately predicts a negative outcome, like identifying a
healthy rice plant as healthy.
FN: When the model incorrectly identifies a healthy rice plant as diseased.
iii. Recall, on the other hand, measures the model’s ability to capture all positive
instances by calculating the proportion of true positive predictions among all
actual positive instances in the dataset.
* 100 (13)
Where;
TP: When the model correctly identifies a positive outcome, such as detecting
a diseased rice plant as diseased
FN: When the model incorrectly identifies a healthy rice plant as diseased.
iv. F1-score, which is the harmonic mean of precision and recall, provides a balanced
measure of the model's performance, especially when dealing with imbalanced
datasets.
* 100 (12)
CHAPTER FOUR
4.0 INTRODUCTION
This chapter details the implementation of the VGG16 model, which was evaluated
for its performance in classifying rice leaf diseases. The goal is to assess how
effectively the model can identify and differentiate between various rice leaf diseases,
such as brown spot, leaf blight, tungro, and leaf blast. By improving the accuracy and
efficiency of disease detection, this model aims to contribute to better crop
management and overall agricultural health in the coming years.
4.1 SYSTEM SPECIFICATION
The specified hardware and software requirements listed below were used to
implement the planned system.
Hardware:
a. Processor: Intel(R) Core(TM) i5-7200U CPU @ 2.50GHz 2.71 GHz
b. Installed RAM: 32.0 GB (31.9 GB usable)
c. System Type: 64-bit operating system, x64-based processor
Software:
a. Operating System: Windows 10 pro
b. Environment and Application: Google Colab and Jupyter Notebook (Python 3.11.4)
4.2 CODE IMPLEMENTATION
This section outlines the key tools and processes involved in building and deploying
the rice leaf disease classification system using the VGG16 model. It involves not just
integrating software components like the TensorFlow and Keras frameworks, but also
overseeing the training and validation stages to ensure the model meets the
performance benchmarks set during the design phase. This stage involves translating
the project's objectives, accurate classification of rice leaf diseases, into a detailed
plan for the model's implementation. The system's design and implementation are
integral to achieving the overall project goals, and for the model to function
successfully, careful planning, execution, and ongoing evaluation are essential.
During the design phase, the VGG16 model architecture was chosen based on the
requirements defined in the problem analysis phase, where the challenge was to
46
accurately classify rice leaf diseases such as brown spot, leaf blight, tungro, and leaf
blast. This design process marks the transition from identifying the problem to
specifying the technical solution. The user requirements, such as classification
accuracy, generalization capability, and model efficiency, were the inputs for this
phase. The output consists of the VGG16 model architecture, training pipeline, and
evaluation metrics, which provide a framework for the implementation.
The system implementation phase involves training the VGG16 model on the rice leaf
disease dataset, fine-tuning its parameters, and validating its performance. This
includes model training, validation, and performance evaluation, ensuring the system
meets the required accuracy standards.
4.3 LIBRARIES
In this project, a variety of powerful libraries and modules are utilized to handle
different aspects of data processing, model building, training, validation, and
visualization for classifying rice leaf diseases using the VGG16 model.
The os library is used for interacting with the operating system to manage file and
directory operations, such as organizing the dataset into training and validation
directories. For numerical operations, particularly linear algebra and array
manipulation, numpy is essential in handling image data and normalizing pixel values.
Meanwhile, pandas is employed for efficient data processing, such as handling
metadata and CSV file input/output related to the dataset. Visualization plays an
important role in monitoring model performance and data distribution. Here,
matplotlib.pyplot and seaborn are used to generate graphs for visualizing training and
validation accuracy, loss curves, and confusion matrices, giving a clear view of how
the model behaves during training and evaluation. The core of the project revolves
around the tensorflow and keras libraries. Keras provides high-level APIs to build the
convolutional neural network (CNN) using layers such as Conv2D, MaxPool2D,
Flatten, Dense, Dropout, and BatchNormalization for structuring the model. The
ImageDataGenerator module is crucial for augmenting the rice leaf disease images,
enabling better generalization by artificially expanding the training dataset through
transformations like rotation, flipping, and zooming.
47
For image processing tasks, cv2 (OpenCV) is used to load, resize, and manipulate
images before feeding them into the model. This ensures that the input data is
properly pre-processed and ready for classification. The model training process
involves optimizing the learning using different optimizers like Adam, RMSprop,
SGD, and Adamax, allowing fine-tuning of the model’s performance. Additionally,
regularizers are used to prevent overfitting during training by penalizing large weights.
The backbone of the model is the pre-trained VGG16 architecture, imported from
tensorflow.keras.applications. VGG16 is a well-established CNN model that
serves as a base for transfer learning, leveraging its pre-trained weights on a large
dataset and adapting it to classify rice leaf diseases with high accuracy. Each of these
libraries plays a vital role in ensuring the smooth functioning of the rice leaf disease
classification system, from data preprocessing to building, training, and fine-tuning
the model, as well as visualizing the results.
Figure 4.1: Imported Libraries
4.4 DATA READING
The datasets were stored on Google Drive, and to enable seamless access and
utilization, the drive was mounted to Google Colaboratory. Google Colaboratory,
commonly known as Google Colab, is a cloud-based platform that lets users write and
run Python code directly in a web browser. It provides free access to high￾performance computational resources, such as GPUs and TPUs, making it ideal for
tasks that require heavy processing power. This integration allowed us to read the
datasets directly from Google Drive without needing local storage. Using Colab, I
carried out various stages of the deep learning pipeline, including training, validation,
48
and testing of our models. This cloud-based approach not only streamlined the data
handling process but also ensured efficient operations within a collaborative and
scalable environment, significantly enhancing the workflow's effectiveness and
manageability.
Figure 4.2: Mounting Google Drive
4.5 DATA READING
During this stage, three primary activities were undertaken to ensure the rice leaf
disease images were appropriately formatted for input into the VGG16 deep learning
model. These activities include image resizing, scaling, and image augmentation.
The images were first resized to a uniform size of 224x224 pixels, a crucial step in
maintaining consistency when feeding the data into the neural network. The specified
target size of 224x224 pixels aligns with the standard input size for the VGG16
architecture, ensuring the model can process the data efficiently without resizing
inconsistencies.
In addition to resizing, the images underwent scaling. The pixel values, originally
ranging from 0 to 255, were normalized by scaling them down to a range of 0 to 1
using the rescale=1./255 parameter in the ImageDataGenerator. This normalization
step is essential for deep learning models as it facilitates faster convergence and
improves the model’s overall performance by preventing large input values from
skewing the learning process.
Finally, data augmentation techniques were applied to enhance the training dataset
and improve the model’s ability to generalise. The ImageDataGenerator was set up
with various augmentation parameters, such as rotation_range=30 (to rotate images up
to 30 degrees), width_shift_range=0.2 and height_shift_range=0.2 (for shifting images),
shear_range=0.2 (to shear images), zoom_range=0.2 (for zoom transformations), and
horizontal_flip=True (to flip images horizontally). These augmentations simulated real￾world variations in the rice leaf images, making the model more resilient to overfitting
and improving its accuracy on new, unseen data.
The dataset was loaded using tf.keras.preprocessing.image_dataset_from_directory,
where the images were resized and batched. The dataset was also split into training
49
and validation sets, with 80% of the data used for training and 20% reserved for
validation. The flow_from_directory function was used to load the images into the
model, ensuring that the images were in the correct size and format, and augmentation
was applied only to the training data to enhance model generalization. This structured
approach to data preprocessing sets a solid foundation for training the VGG16 model
on the rice leaf disease dataset.
Figure 4.3: Image Preprocessing (1)
Figure 4.4: Image Preprocessing (2)
Figure 4.5: Image Preprocessing (3)
50
4.6 DISCUSSION OF RESULT
The results provided are derived from the performance evaluation of the VGG16
model used to classify rice leaf diseases. The model achieved an impressive validation
accuracy of 91.59%, demonstrating its high capability in correctly identifying and
classifying various disease types. This strong accuracy reflects the model's
effectiveness in handling the complexity of rice leaf disease classification.
The precision of the model was calculated at 0.91, indicating that the majority of the
disease classifications marked as positive by the model were indeed correct. A high
precision score signifies a low rate of false positives, meaning the model made very
few incorrect positive predictions for rice leaf diseases.
The recall, or sensitivity, was found to be 0.89, highlighting the model's ability to
correctly identify actual disease cases. This score shows that the model is proficient at
detecting true positives, making it reliable for identifying diseased rice leaves
accurately.
Furthermore, the F1-score, which balances precision and recall, stood at 0.89. This
indicates that the model is robust in maintaining a balance between precision and
recall, ensuring both the correctness of positive predictions and the model’s
effectiveness in capturing true disease instances.
Overall, these metrics collectively demonstrate the VGG16 model's strong
performance and reliability in classifying rice leaf diseases, making it an effective tool
in detecting and diagnosing these conditions with high accuracy and precision.
Figure 4.6: Confusion Matrix
51
52
The classification results of the VGG16 model across the five categories, Bacterial
Blight, Blast, Brownspot, Healthy, and Tungro, highlight strong overall performance.
Notably, the model achieved perfect precision for both Healthy and Tungro classes,
with scores of 1.00, indicating no false positives. However, Tungro showed a lower
recall at 0.66, suggesting some cases were missed. Bacterial Blight had a high recall of
0.98, making it very effective at detecting true positives, while Blast and Brownspot
demonstrated balanced performance with F1-scores of 0.91 and 0.86, respectively.
Overall, the model shows strong precision and recall, though some challenges remain
in identifying certain disease cases like Tungro.
Table 4.1: Individual Result
Precision Recall F1-score
Bacterial Blight 0.87 0.98 0.92
Blast 0.97 0.85 0.91
Brownspot 0.77 0.97 0.86
Healthy 1.00 0.94 0.97
Tungro 1.00 0.66 0.80
Figure 4.7: Visualisation of Individual Result
53
The VGG16 model used for rice leaf disease classification demonstrated strong
performance across several key metrics. It achieved an overall accuracy of 0.91,
reflecting its ability to correctly classify the majority of cases. The precision score of
0.91 indicates that the model made very few false positive predictions. Its recall of
0.89 highlights its effectiveness in correctly identifying true disease cases, while the
F1-score of 0.89 shows a well-balanced performance between precision and recall.
These results indicate that the VGG16 model is highly reliable for classifying rice leaf
diseases with strong overall performance.
Table 4.2: Collective Result
Metric Result
Accuracy 0.91
Precision 0.91
Recall 0.89
F1-score 0.89
Table 4.3: Training Performance
Epoch Train
Duration
Accuracy Loss Validation
Accuracy
Validation
Loss
1 3355 0.8980 0.2416 0.9443 0.1623
2 272 0.9092 0.2334 0.9455 0.1667
3 254 0.9144 0.2226 0.8851 0.2687
4 252 0.9050 0.2282 0.8590 0.3219
5 250 0.9064 0.2263 0.9017 0.2101
6 259 0.9123 0.2094 0.9467 0.1565
7 277 0.9229 0.1977 0.9230 0.1825
8 222 0.9245 0.1975 0.9230 0.1810
9 259 0.9262 0.1891 0.8815 0.2838
10 273 0.9227 0.1981 0.9194 0.1713
Figure 4.8Training Accuracy vs Validation Accuracy
Figure 4.9Training Loss vs Validation Loss
4.7 WEBSITE
The website developed is a tool created to help users detect common diseases in rice
leaves automatically. Developed as part of a project to use AI in agriculture, it
employs the deep learning model (VGG16) trained on images of both diseased and
healthy rice leaves. By uploading an image, users, such as farmers and agricultural
professionals, can quickly classify diseases like tungro, blast, bacterial blight, and
54
brown spot. This helps manage diseases efficiently, reducing the risk of crop loss. The
pictures of the website are below;
Figure 4.10 Homepage of the Website
Figure 4.11 Image Showing Bacterial Blight Prediction
55
Figure 4.12 Image Showing Leaf Blast Prediction
Figure 4.13 Image Showing Brown Spot Prediction
56
Figure 4.14 Image Showing Tungro Prediction
Figure 4.15 Image Showing Healthy Prediction
57
CHAPTER FIVE
5.1 CONCLUSION
This project set out to create a reliable system for classifying rice leaf diseases using
the VGG16 model and a dataset of rice plant images. The model was thoroughly
tested to evaluate its ability to identify four specific rice leaf conditions: Brown Spot,
Leaf Blast, Tungro, and Bacterial Blight. Performance metrics like accuracy,
precision, recall, and F1-score were used to assess how well the model performed.
Achieving an overall accuracy of 91%, the VGG16 model proved effective in
managing the complexities involved in classifying rice diseases. The high precision
and recall scores for most diseases, especially for Healthy and Bacterial Blight cases,
indicate that the model is good at minimising false positives and accurately
identifying true cases.
The project demonstrates that deep learning techniques, especially CNN-based
architectures like VGG16, can significantly enhance early detection and accurate
classification of rice plant diseases. However, the model's performance on some
diseases, particularly Tungro, fell short of expectations, highlighting the need for
improvements in detecting certain minority classes. Despite this limitation, the system
showed encouraging results and has potential for real-time applications in agricultural
settings.
5.2 RECOMMENDATION
While the VGG16 model demonstrated effectiveness in this study, there are several
factors to consider when implementing it in real-world agricultural settings. One
significant challenge is the interpretability of the model; deep learning models,
particularly CNNs, are often referred to as "black boxes." Future efforts should focus
on integrating explainable AI techniques to make the model's predictions clearer and
more understandable for non-technical users, such as farmers.
58
Additionally, real-time performance and computational efficiency are crucial for the
successful application of this model in field conditions. Although the model
performed well during testing, further optimisation may be necessary to enhance its
speed, especially on mobile devices. Techniques like model pruning and quantisation
could be explored to reduce the computational load without compromising
performance.
Furthermore, extensive testing on larger and more diverse datasets is vital. The dataset
used in this project had a limited scope, and its ability to generalise to new, unseen
data across different geographical locations and environmental conditions remains
unverified. Future studies should incorporate datasets from various regions and
climates to ensure the model's robustness and generalisation across different
environments.
59
60
REFERENCES
26.5 million Nigerians projected to be food insecure in 2024 - Nigeria. (2023,
November 13). ReliefWeb. https://reliefweb.int/report/nigeria/265-million-nigerians￾projected-be-food-insecure-2024
Aggarwal, S., Suchithra, M., Chandramouli, N., Sarada, M., Vetrithangam, D., Pant,
B., … & Adugna, B. (2022). Rice disease detection using artificial intelligence and
machine learning techniques to improvise agro-business. Scientific Programming,
2022, 1-13. https://doi.org/10.1155/2022/1757888
Agrawal, T. (2018). Plant Pathology Introduction. Annals of Reviews and Research,
2(2). https://doi.org/10.19080/arr.2018.02.555584
Ali, S., Li, J., Pei, Y., Aslam, M., Shaukat, Z., & Azeem, M. (2020). An effective and
improved cnn-elm classifier for handwritten digits recognition and classification.
Symmetry, 12(10), 1742. https://doi.org/10.3390/sym12101742
Alsaeedi, A. (2023). Dynamic clustering strategies boosting deep learning in olive leaf
disease diagnosis. Sustainability, 15(18), 13723. https://doi.org/10.3390/su151813723
Ashtari, H. (2022, May 13). Computer Vision Meaning, Examples, Applications.
Spiceworks Inc. https://www.spiceworks.com/tech/artificial￾intelligence/articles/what-is-computer-vision/
Awaysheh, A., Wilcke, J., Elvinger, F., Rees, L., Fan, W., & Zimmerman, K. L.
(2016). Evaluation of supervised machine-learning algorithms to distinguish between
inflammatory bowel disease and alimentary lymphoma in cats. Journal of Veterinary
Diagnostic Investigation, 28(6), 679–687. https://doi.org/10.1177/1040638716657377
61
Bai, R., & Ghosh, M. (2018). High-dimensional multivariate posterior consistency
under global–local shrinkage priors. Journal of Multivariate Analysis, 167, 157-170.
https://doi.org/10.1016/j.jmva.2018.04.010
Bari, B., Islam, N., Rashid, M., Hasan, J., Razman, M., Musa, R., … & Majeed, A.
(2021). A real-time approach of diagnosing rice leaf disease using deep learning-based
faster r-cnn framework. PeerJ Computer Science, 7, e432.
https://doi.org/10.7717/peerj-cs.432
Beam, A. L., & Kohane, I. S. (2018). Big Data and Machine Learning in Health Care.
JAMA, 319(13), 1317. https://doi.org/10.1001/jama.2017.18391
Berkhin, P. (2006). A Survey of Clustering Data Mining Techniques. In Springer
eBooks (pp. 25–71). https://doi.org/10.1007/3-540-28349-8_2
Blessing, E., & Klaus, H. (2023). Techniques involved in selecting, transforming, and
enhancing features for machine learning models. Techniques Involved in Selecting,
Transforming, and Enhancing Features for Machine Learning Models.
Breeding disease-resistant horticultural crops. (2024). In Elsevier eBooks.
https://doi.org/10.1016/c2022-0-01172-7
Chen, D., Anran, E., Tan, T., Ramachandran, R., Li, F., Cheung, C., … & Al-Aswad,
L. (2023). Applications of artificial intelligence and deep learning in glaucoma. Asia￾Pacific Journal of Ophthalmology, 12(1), 80-93.
https://doi.org/10.1097/apo.0000000000000596
Chen, J., & Wang, X. (2023). Data-driven multinomial random forest. arXiv (Cornell
University). https://doi.org/10.48550/arxiv.2304.04240
Copeland, B. (2024, July 9). Artificial intelligence. Encyclopedia Britannica.
https://www.britannica.com/technology/artificial-intelligence
62
Coursera Staff. (2024). What is artificial intelligence? Definition, uses, and types. In
Coursera. Coursera. Retrieved July 9, 2024, from
https://www.coursera.org/articles/what-is-artificial-intelligence
Coursera Staff. (2024). What is superintelligence? In Coursera. Coursera. Retrieved
July 9, 2024, from https://www.coursera.org/articles/super-intelligence
Delua, J. (2021). Supervised vs. unsupervised learning: What’s the difference? IBM
Blog. https://www.scirp.org/reference/referencespapers?referenceid=3614029
Deng, L., Fan, C., Gao, X., Yu, W., Shi, J., Zhou, L., … & Lv, Y. (2023). Hospital
crowdedness evaluation and in-hospital resource allocation based on image
recognition technology. Scientific Reports, 13(1). https://doi.org/10.1038/s41598-022-
24221-6
Deo, R. C. (2015). Machine learning in medicine. Circulation, 132(20), 1920–1930.
https://doi.org/10.1161/CIRCULATIONAHA.115.001593
Deshmukh, A., Regatti, J., Manavoglu, E., & Doǧan, Ü. (2022). Representation
learning for clustering via building consensus. Machine Learning, 111(12), 4601-4638.
https://doi.org/10.1007/s10994-022-06194-9
Engati. (n.d.). Unsupervised learning. https://www.engati.com/glossary/unsupervised￾learning#:~:text=Association%20is%20another%20type%20of,This%20Item%20Also
%20Bought%E2%80%9D%20recommendations.
Escott, E. (2017, October 24). What are the 3 types of AI? A guide to narrow, general,
and super artificial intelligence. Codebots. https://codebots.com/artificial￾intelligence/the-3-types-of-ai-is-the-third-even-possible
Fan, X. (2023). DMC-UNet-based segmentation of lung nodules. IEEE Access, 11,
110809-110826. https://doi.org/10.1109/access.2023.3322437
Gillis, A. S., Lutkevich, B., & Burns, E. (2024, February 15). Natural language
processing (NLP). Enterprise AI.
63
https://www.techtarget.com/searchenterpriseai/definition/natural-language￾processing￾NLP#:~:text=Natural%20language%20processing%20(NLP)%20is,in%20the%20field
%20of%20linguistics.
Habib, M. S., & Nura, B. M. (2021). Improving rice production by detecting diseases
using IoT in North West Nigeria. International Journal of Advanced Academic
Research, 7(10), 26–38.
Ho, Y., & Wookey, S. (2020). The real-world-weight cross-entropy loss function:
Modelling the costs of mislabeling. IEEE Access, 8, 4806–4813.
https://doi.org/10.1109/access.2019.2962617
Hu, H. (2023). Galaxy classification based on convolutional neural networks with
dropout technique. Applied and Computational Engineering, 22(1), 42-52.
https://doi.org/10.54254/2755-2721/22/20231166
Huangi, L., Yang, D., Liu, B., & Deng, J. (2018). Decorrelated batch normalization.
Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition.
https://doi.org/10.1109/cvpr.2018.00089
IBM Data and AI Team. (2023, July 6). AI vs. machine learning vs. deep learning vs.
neural networks. IBM. https://www.ibm.com/think/topics/ai-vs-machine-learning-vs￾deep-learning-vs-neural-networks
Ioffe, S. (2015). Batch normalization: Accelerating deep network training by reducing
internal covariate shift. arXiv. https://doi.org/10.48550/arxiv.1502.03167
Jartarkar, S. (2022). Artificial intelligence: Its role in dermatopathology. Indian
Journal of Dermatology Venereology and Leprology, 89, 549-552.
https://doi.org/10.25259/ijdvl_725_2021
Jiang, W., Thapa, S., Jessup, K. E., Hao, B., Hou, X., Marek, T., Becker, J., Bell, J., &
Xue, Q. (2020). Corn response to later than traditional planting dates in the Texas
High Plains. Crop Science, 60(2), 1004–1020. https://doi.org/10.1002/csc2.20042
64
Johnson, J. (2020). 4 types of artificial intelligence. BMC Blogs.
https://www.bmc.com/blogs/artificial-intelligence-types
Johnson, R., & Zhang, T. (2015). Effective use of word order for text categorization
with convolutional neural networks. arXiv. https://doi.org/10.3115/v1/n15-1011
Kanade, V. (2022, March 25). Narrow AI vs. General AI vs. Super AI: Key
comparisons. Spiceworks. https://www.spiceworks.com/tech/artificial￾intelligence/articles/narrow-general-super-ai-difference/
Kannan, M., Saad, M., Talip, N., Baharum, S., & Bunawan, H. (2019). Complete
genome sequence of rice tungro bacilliform virus infecting Asian rice (Oryza sativa)
in Malaysia. Microbiology Resource Announcements, 8(20).
https://doi.org/10.1128/mra.00262-19
Khalid, W., & Herbert-Hansen, Z. N. L. (2018). Using k-means clustering in
international location decision. Journal of Global Operations and Strategic Sourcing,
11(3), 274–300. https://doi.org/10.1108/jgoss-11-2017-0056
Kühl, N., Schemmer, M., Goutier, M., & Satzger, G. (2022). Artificial intelligence and
machine learning. Electronic Markets, 32(4), 2235–2244.
https://doi.org/10.1007/s12525-022-00598-0
Lin, J., Zhong, C., Hu, D., Rudin, C., & Seltzer, M. (2020). Generalized and scalable
optimal sparse decision trees. arXiv. https://doi.org/10.48550/arxiv.2006.08690
Liu, Y., Li, Y., Xu, Z., Liu, X., Xie, H., & Zeng, H. (2023). Guided dropout:
Improving deep networks without increased computation. Intelligent Automation &
Soft Computing, 36(3), 2519-2528. https://doi.org/10.32604/iasc.2023.033286
M. (2023). Total global rice consumption 2008/09-2022/23. Statista.
https://www.statista.com/statistics/255977/total-global-rice-consumption/
65
Mahibha, G., & Balasubramanian, P. (2023). Impact of artificial intelligence in
agriculture with special reference to agriculture information research. Current
Agriculture Research Journal, 11(1), 287-296. https://doi.org/10.12944/carj.11.1.25
Marr, B. (2018, July 25). How is AI used in education ,  Real-world examples of
today and a peek into the future. Forbes.
https://www.forbes.com/sites/bernardmarr/2018/07/25/how-is-ai-used-in-education￾real-world-examples-of-today-and-a-peek-into-the-future/
Mehta, S., Singh, B., Dhakate, P., Rahman, M., & Islam, M. A. (2019). Rice, marker￾assisted breeding, and disease resistance. In Springer eBooks (pp. 83–111).
https://doi.org/10.1007/978-3-030-20728-1_5
Mirandilla, J., Yamashita, M., Yoshimura, M., & Paringit, E. (2023). Leaf spectral
analysis for detection and differentiation of three major rice diseases in the
Philippines. Remote Sensing, 15(12), 3058. https://doi.org/10.3390/rs15123058
Mislick, G., & Nussbaum, D. (2015). Linear regression analysis. In M. J. Pelczar, & A.
C. Kelman (Eds.), Statistical methods for engineers and scientists (pp. 121–151).
Wiley. https://doi.org/10.1002/9781118802342.ch7
Muslikh, A. (2023). Rice disease recognition using transfer learning Xception
convolutional neural network. Jurnal Teknik Informatika, 4(6), 1535-1540.
https://doi.org/10.52436/1.jutif.2023.4.6.1529
Nanni, L., Brahnam, S., Paci, M., & Ghidoni, S. (2022). Comparison of different
convolutional neural network activation functions and methods for building
ensembles for small to midsize medical data sets. Sensors, 22(16), 6129.
https://doi.org/10.3390/s22166129
Ning, D., Song, A., Fan, F., Li, Z., & Liang, Y. (2014). Effects of slag-based silicon
fertilizer on rice growth and brown-spot resistance. PLoS ONE, 9(7), e102681.
https://doi.org/10.1371/journal.pone.0102681
66
Nozari, H., Ghahremani-Nahr, J., & Szmelter-Jarosz, A. (2024). AI and machine
learning for real-world problems. In A. Ghahremani-Nahr, A. Szmelter-Jarosz (Eds.),
Advances in computers (pp. 1–12). https://doi.org/10.1016/bs.adcom.2023.02.001
Nurhaida, I., Ayumi, V., Fitrianah, D., Zen, R., Noprisson, H., & Wei, H. (2020).
Implementation of deep neural networks (DNN) with batch normalization for batik
pattern recognition. International Journal of Electrical and Computer Engineering,
10(2), 2045. https://doi.org/10.11591/ijece.v10i2.pp2045-2053
Obi, G. (2019, October 21). Rice industry review. KPMG.
https://kpmg.com/ng/en/home/insights/2019/10/rice-industry-review.html
Olorunlambe, K., Hua, Z., Shepherd, D., & Dearn, K. (2021). Towards a diagnostic
tool for diagnosing joint pathologies: Supervised learning of acoustic emission signals.
Sensors, 21(23), 8091. https://doi.org/10.3390/s21238091
Paramita, A. S. (2022). Implementation of the k-nearest neighbor algorithm for the
classification of student thesis subjects. Journal of Applied Data Sciences, 3(3), 128-
136. https://doi.org/10.47738/jads.v3i3.66
Pawar, A. A., Patwardhan, S. B., Barage, S., Raut, R., Lakkakula, J., Roy, A., Sharma,
R., & Anand, J. (2023). Smartphone-based diagnostics for biosensing infectious
human pathogens. Progress in Biophysics and Molecular Biology, 180–181, 120–130.
https://doi.org/10.1016/j.pbiomolbio.2023.05.002
Pelczar, R. M., Pelczar, M. J., Shurtleff, M. C., & Kelman, A. (2023, December 28).
Plant disease. Encyclopedia Britannica. https://www.britannica.com/science/plant￾disease
Peng, S., Tang, Q., & Zou, Y. (2009). Current status and challenges of rice production
in China. Plant Production Science, 12(1), 3–8. https://doi.org/10.1626/pps.12.3
Prasad, B., & Eizenga, G. C. (2008). Rice sheath blight disease resistance identified in
Oryza spp. accessions. Plant Disease, 92(11), 1503–1509. https://doi.org/10.1094/PDIS-
92-11-1503
67
Pruneski, J. A., Pareek, A., Kunze, K. N., Martin, R. K., Karlsson, J., Oeding, J. F.,
Kiapour, A. M., Nwachukwu, B. U., & Williams, R. J. (2022). Supervised machine
learning and associated algorithms: Applications in orthopedic surgery. Knee Surgery,
Sports Traumatology, Arthroscopy, 31(4), 1196–1202. https://doi.org/10.1007/s00167-
022-07181-2
Rashid, M., Bari, B., Yusup, Y., Kamaruddin, M., & Khan, N. (2021). A
comprehensive review of crop yield prediction using machine learning approaches
with special emphasis on palm oil yield prediction. IEEE Access, 9, 63406-63439.
https://doi.org/10.1109/access.2021.3075159
Sahota, N. (2022, September 27). 7 types of artificial intelligence (with examples).
Neil Sahota Inspiring Innovation. Retrieved July 9, 2024, from
https://www.neilsahota.com/7-types-of-artificial-intelligence-with-examples/
Saleem, M., Senan, N., Wahid, F., Aamir, M., Samad, A., & Khan, M. (2022).
Comparative analysis of recent architecture of convolutional neural network.
Mathematical Problems in Engineering, 2022, 1-9. https://doi.org/10.1155/2022/7313612
Sari, S., Soesanti, I., & Setiawan, N. (2021). Development of CAD system for
automatic lung nodule detection: A review. BIO Web of Conferences, 41, 04001.
https://doi.org/10.1051/bioconf/20214104001
Sarker, I. H. (2021). Machine learning: Algorithms, real-world applications and
research directions. SN Computer Science, 2, 160. https://doi.org/10.1007/s42979-021-
00592-x
Seldon. (2022, September 16). Supervised vs unsupervised learning explained. Seldon.
https://www.seldon.io/supervised-vs-unsupervised-learning-explained
Shahjahan, M., Imbe, T., Jalani, B. S., Zakri, A. H., & Othman, O. (2008). Inheritance
of resistance to rice tungro spherical virus in rice (Oryza sativa L.). Rice Genetics
Collection, 247-254. https://doi.org/10.1142/9789812814272_0025
68
Shrivastava, V., Pradhan, M., Minz, S., & Thakur, M. (2019). Rice plant disease
classification using transfer learning of deep convolution neural network. The
International Archives of the Photogrammetry Remote Sensing and Spatial
Information Sciences, XLII-3/W6, 631-635. https://doi.org/10.5194/isprs-archives-xlii-
3-w6-631-2019
Sidhu, J. K., Davis, R. M., Falk, B. W., Nuñez, J., & Turini, T. A. (2024, March). UC
IPM pest management guidelines: Carrot. Retrieved July 9, 2024, from
https://ipm.ucanr.edu/agriculture/carrot/bacterial-leaf-blight/
Suchita, S., Sakshi, P., Parwan, S., Hallan, S., & Sood, V. (2023). Plant pathology:
Introduction, history, and importance. BIO Web of Conferences, 41, 04001.
Takahashi, K., Kitamura, S., Fukushima, K., Sang, Y., Tsuji, K., & Wada, J. (2021).
The resolution of immunofluorescent pathological images affects diagnosis for not
only artificial intelligence but also humans. Journal of Nephropathology, 10(3), e26.
https://doi.org/10.34172/jnp.2021.26
Tejaswini, P., Singh, P., Ramchandani, M., Rathore, Y. K., & Janghel, R. R. (2022).
Rice leaf disease classification using CNN. IOP Conference Series: Earth and
Environmental Science, 1032(1), 012017. https://doi.org/10.1088/1755-
1315/1032/1/012017
Telefónica. (2023, July 4). Uses and applications of artificial intelligence in robotics.
Telefónica. https://www.telefonica.com/en/communication-room/blog/uses-and￾applications-of-artificial-intelligence-in-robotics/
Tewari, S., & Sharma, S. (2019). Molecular techniques for diagnosis of bacterial plant
pathogens. In Molecular plant pathology (pp. 481–497). Elsevier.
https://doi.org/10.1016/b978-0-12-814849-5.00027-7
Tian, J. (2024). Intelligent medical detection and diagnosis assisted by deep learning.
Applied and Computational Engineering, 64(1), 121-126. https://doi.org/10.54254/2755-
2721/64/20241356
69
Uddin, M., Wang, Y., & Woodbury-Smith, M. (2019). Artificial intelligence for
precision medicine in neurodevelopmental disorders. npj Digital Medicine, 2(1).
https://doi.org/10.1038/s41746-019-0191-0
Uddin, M. Z., Mahamood, M. N., Ray, A., Pramanik, M. I., Alnajjar, F. S., & Ahad,
M. A. (2024). E2ETCA: End-to-end training of CNN and attention ensembles for rice
disease diagnosis. Journal of Integrative Agriculture.
Unsupervised Learning | Engati. (n.d.). Engati.
https://www.engati.com/glossary/unsupervised￾learning#:~:text=Association%20is%20another%20type%20of,This%20Item%20Also
%20Bought%E2%80%9D%20recommendations.
Veeramreddy, R. (2024). Detection of diseases in rice leaf using convolutional neural
network with transfer learning based on ResNeXt. International Journal of Electrical
and Computer Engineering, 14(2), 1739. https://doi.org/10.11591/ijece.v14i2.pp1739-
1749
Wallet, B. C., & Hardisty, R. (2019). Unsupervised seismic facies using Gaussian
mixture models. Interpretation, 7(3), SE93–SE111. https://doi.org/10.1190/int-2018-
0119.1
Xu, H., Yao, S., Li, Q., & Ye, Z. (2020). An improved K-means clustering algorithm.
IEEE Access, 8, 9297060. https://doi.org/10.1109/idaacs-sws50031.2020.9297060
Ye, M., Zhang, H., & Li, L. (2019). Research on data mining application of orthopedic
rehabilitation information for smart medical. IEEE Access, 7, 177137-177147.Yen, H.
(2024, May 13). Rice bacterial blight. Encyclopedia Britannica.
https://www.britannica.com/science/rice-bacterial-blight
Zhang, W., Lei, W., Xu, X., & Xing, X. (2016). Improved music genre classification
with convolutional neural networks. Interspeech 2016.
https://doi.org/10.21437/interspeech.2016-1236
Zhong, H., Sun, X., Lv, X., & Jiao, W. (2023). Advances in the co-host immune
response to multisystem inflammatory syndrome and Kawasaki disease in children
with AI-guided features. International Journal of Tropical Disease & Health, 44(6),
51–58. https://doi.org/10.9734/ijtdh/2023/v44i61415
Zhou, G., Zhang, W., Chen, A., He, M., & Ma, X. (2019). Rapid detection of rice
disease based on FCM-KM and Faster R-CNN fusion. IEEE Access, 7, 143190–143206.
https://doi.org/10.1109/access.2019.2943454
70
APPENDIX
import numpy as np # linear algebra
import pandas as pd # data processing, CSV file I/O (e.g. pd.read_csv)
import os
import matplotlib.pyplot as plt
import seaborn as sns
import tensorflow as tf
import keras
from keras.preprocessing import image
from keras.models import Sequential
from keras.layers import Conv2D, MaxPool2D, Flatten, Dense, Dropout,
BatchNormalization
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import cv2
from keras import regularizers
from tensorflow.keras.optimizers import Adam, RMSprop, SGD, Adamax
import joblib # **import joblib for model saving and loading**
from google.colab import drive
drive.mount('/content/drive')
dataset = tf.keras.preprocessing.image_dataset_from_directory(
r"/content/drive/MyDrive/Rice Leaf Disease Images",
shuffle=True,
image_size=(150,150),
batch_size=32
)
71
class_names = dataset.class_names
print(class_names)
len(dataset)
for image_batch, labels_batch in dataset.take(1):
print(image_batch.shape)
print(labels_batch.numpy())
for image_batch, label_batch in dataset.take(1):
for i in range(12):
ax = plt.subplot(3, 4, i + 1)
plt.imshow(image_batch[i].numpy().astype("uint8"))
plt.title(class_names[label_batch[i]])
plt.axis("off")
datagen = ImageDataGenerator(
rescale=1./255,
validation_split=0.1, # reserve 10% of the data for validation
rotation_range=30,
width_shift_range=0.2,
height_shift_range=0.2,
shear_range=0.2,
zoom_range=0.2,
horizontal_flip=True,
fill_mode='nearest'
)
base_dir= r"/content/drive/MyDrive/Rice Leaf Disease Images"
train_generator = datagen.flow_from_directory(
base_dir,
target_size=(150, 150),
color_mode="rgb",
72
batch_size=32,
subset='training', # set as training data
class_mode='categorical'
)
validation_generator = datagen.flow_from_directory(
base_dir,
target_size=(150, 150),
color_mode="rgb",
batch_size=32,
subset='validation', # set as validation data
class_mode='categorical'
)
from tensorflow.keras.applications import VGG16
conv_base = VGG16(weights='imagenet',
include_top=False,
input_shape=(150,150,3))
model = Sequential()
model.add(conv_base)
model.add(Flatten())
model.add(Dense(256, activation='relu'))
model.add(Dense(5, activation='softmax'))
conv_base.trainable = False
model.compile(
optimizer=Adam(learning_rate=0.001),
loss='categorical_crossentropy',
metrics=['accuracy']
)
73
history = model.fit(train_generator, validation_data=validation_generator, epochs=10)
fig, ax = plt.subplots(1, 2)
# Retrieve training accuracy, validation accuracy, training loss, and validation loss
train_acc = history.history['accuracy']
val_acc = history.history['val_accuracy']
train_loss = history.history['loss']
val_loss = history.history['val_loss']
# Set the figure size
fig.set_size_inches(12, 4)
# Plot training and validation accuracy with markers
ax[0].plot(train_acc, marker='o') # Add markers for training accuracy
ax[0].plot(val_acc, marker='o') # Add markers for validation accuracy
ax[0].set_title('Training Accuracy vs Validation Accuracy')
ax[0].set_ylabel('Accuracy')
ax[0].set_xlabel('Epoch')
ax[0].legend(['Train', 'Validation'], loc='lower right')
# Adjust the y-axis limits for accuracy (closer to 0-1 range)
ax[0].set_ylim([0, 1]) # Accuracy is between 0 and 1
ax[0].set_yticks(np.arange(0, 1.1, 0.1)) # Set tick marks at intervals of 0.1
# Plot training and validation loss with markers
ax[1].plot(train_loss, marker='o') # Add markers for training loss
ax[1].plot(val_loss, marker='o') # Add markers for validation loss
ax[1].set_title('Training Loss vs Validation Loss')
ax[1].set_ylabel('Loss')
ax[1].set_xlabel('Epoch')
74
ax[1].legend(['Train', 'Validation'], loc='upper right')
# Adjust the y-axis limits for loss to minimize unnecessary margins
min_loss = min(min(train_loss), min(val_loss)) # Get the minimum loss value
max_loss = max(max(train_loss), max(val_loss)) # Get the maximum loss value
# Set the y-axis limits close to the minimum and maximum loss values, with a small
margin
ax[1].set_ylim([min_loss - 0.1, max_loss + 0.1])
# Set tick marks on the y-axis to show more numbers
ax[1].set_yticks(np.arange(min_loss - 0.1, max_loss + 0.2, 0.1)) # Set tick marks at
intervals of 0.1
# Show the plots with tighter layout
plt.tight_layout()
plt.show()
# Evaluate and print accuracy on validation data
print("Accuracy of our model on validation data: ",
model.evaluate(validation_generator)[1] * 100, "%")
import matplotlib.pyplot as plt
import numpy as np
# Get class labels
class_labels = list(train_generator.class_indices.keys())
# Get the counts of each class in the training and validation sets
train_counts = np.zeros(len(class_labels))
val_counts = np.zeros(len(class_labels))
for i in range(len(train_generator.classes)):
75
train_counts[train_generator.classes[i]] += 1
for i in range(len(validation_generator.classes)):
val_counts[validation_generator.classes[i]] += 1
# Create the bar chart
x = np.arange(len(class_labels)) # label locations
width = 0.35 # width of the bars
# Plotting
fig, ax = plt.subplots(figsize=(10, 6))
train_bars = ax.bar(x - width/2, train_counts, width, label='Training Set', color='blue')
val_bars = ax.bar(x + width/2, val_counts, width, label='Validation Set',
color='orange')
# Adding labels and title
ax.set_xlabel('Class Labels')
ax.set_ylabel('Number of Images')
ax.set_title('Number of Images per Class in Training and Validation Sets')
ax.set_xticks(x)
ax.set_xticklabels(class_labels)
ax.legend()
# Show the plot
plt.show()
model.save("vgg16_rice_model.h5")
def extract_data(generator):
data_list = []
76
labels_list = []
for _ in range(generator.__len__()):
data, labels = generator.__next__()
data_list.append(data)
labels_list.append(labels)
x = np.vstack(data_list)
y = np.vstack(labels_list)
return x, y
x_train, y_train = extract_data(train_generator)
x_test, y_test = extract_data(validation_generator)
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score,
precision_recall_fscore_support
# Evaluate model on test data
loss = model.evaluate(x_test, y_test)
print("Test Accuracy: {:.2f}%".format(loss[1] * 100))
# Predict the classes for the test set
preds = model.predict(x_test)
y_pred = np.argmax(preds, axis=1)
# Dictionary of class labels
label_dict = {0: 'Bacterialblight', 1: 'Blast', 2: 'Brownspot', 3: 'Healthy', 4: 'Tungro'}
# Visualizing some predictions
figure = plt.figure(figsize=(28, 12))
for i, index in enumerate(np.random.choice(x_test.shape[0], size=24)):
ax = figure.add_subplot(4, 6, i + 1, xticks=[], yticks=[])
ax.imshow(np.squeeze(x_test[index]))
predict_index = label_dict[(y_pred[index])]
true_index = label_dict[np.argmax(y_test, axis=1)[index]]
77
ax.set_title("{} ({})".format(predict_index, true_index),
color=("green" if predict_index == true_index else "red"))
# Convert y_test to single-digit labels (actual classes)
y_true = np.argmax(y_test, axis=1)
# Generate classification report for individual precision, recall, F1-score, and support
report = classification_report(y_true, y_pred, target_names=label_dict.values(),
output_dict=True)
print("Classification Report:\n")
print(classification_report(y_true, y_pred, target_names=label_dict.values()))
# Display overall metrics (averages)
overall_metrics = precision_recall_fscore_support(y_true, y_pred, average='weighted')
print("\nOverall Metrics:")
print("Precision: {:.2f}".format(overall_metrics[0]))
print("Recall: {:.2f}".format(overall_metrics[1]))
print("F1-score: {:.2f}".format(overall_metrics[2]))
# Confusion Matrix
CM = confusion_matrix(y_true, y_pred)
# Plot confusion matrix
plt.figure(figsize=(8, 6))
sns.heatmap(CM, annot=True, fmt='g', cmap='Purples', cbar=False,
xticklabels=label_dict.values(), yticklabels=label_dict.values())
plt.title("Confusion Matrix")
plt.xlabel("Predicted Labels")
plt.ylabel("True Labels")
plt.show()
# Print the confusion matrix values
print("Confusion Matrix:\n", CM)
78
# Bar chart for individual class metrics (Precision, Recall, F1-score, and Support)
labels = list(label_dict.values())
precision = [report[label]['precision'] for label in labels]
recall = [report[label]['recall'] for label in labels]
f1_score = [report[label]['f1-score'] for label in labels]
support = [report[label]['support'] for label in labels]
# Plotting the bar chart
x = np.arange(len(labels)) # Label locations
width = 0.2 # Width of the bars
fig, ax = plt.subplots(figsize=(12, 8))
# Plot bars for each metric
bar1 = ax.bar(x - width, precision, width, label='Precision')
bar2 = ax.bar(x, recall, width, label='Recall')
bar3 = ax.bar(x + width, f1_score, width, label='F1-score')
# Adding labels and title
ax.set_xlabel('Class Labels')
ax.set_ylabel('Metrics')
ax.set_title('Precision, Recall, and F1-score for Each Class')
ax.set_xticks(x)
ax.set_xticklabels(labels)
ax.legend()
# Display the plot
plt.show()
79