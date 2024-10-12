const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 5000;
const uploadsDir = path.join(__dirname, 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)){
    fs.mkdirSync(uploadsDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Connexion à MongoDB
mongoose.connect('mongodb://localhost:27017/realstate', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connexion à MongoDB réussie !'))
.catch(err => console.error('Erreur de connexion à MongoDB :', err));

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json())
app.get('/image/:filename', (req, res) => {
    const filename = req.params.filename;
    const absolutePath = path.join('/home/vboxuser/backend/uploads', filename);
    res.sendFile(absolutePath);  // Serve the file from the absolute path
  });
// Schéma MongoDB pour la propriété
const propertySchema = new mongoose.Schema({
    idProperty: String,  // Stocker l'ID de la propriété issue du contrat Ethereum
    description: String,
    price: String,
    owner: String,
    forSale: { type: Number, default: 1 } ,
    images: [String]// Tableau pour stocker les chemins des photos
    // Champ ajouté avec valeur par défaut à 1
});
  
const Property = mongoose.model('Property', propertySchema);

// Route POST pour ajouter une propriété
app.post('/add-property', upload.array('images', 5), (req, res) => {
    const { id, description, price, owner } = req.body;
    const imagePaths = req.files ? req.files.map(file => file.path) : [];

    const property = new Property({ 
        idProperty: id,
        description, 
        price, 
        owner,
        images: imagePaths
    });

    property.save()
        .then(() => {
            console.log(`Property added: ${description}, Price: ${price}, Owner: ${owner}, ID: ${id}, Images: ${imagePaths}`);
            res.status(201).json({ message: 'Property added successfully', description, price, owner, id, images: imagePaths });
        })
        .catch(err => {
            console.error('Error adding property:', err);
            res.status(500).json({ message: 'Error adding property' });
        });
});

// Route GET pour récupérer toutes les propriétés
// Assuming you have an express setup
app.get('/properties', (req, res) => {
    Property.find({ forSale: 1 })  // Corrected to forSale
        .then(properties => {
            res.json(properties);
            
        })
        .catch(error => {
            console.error('Error fetching properties:', error);
            res.status(500).send('Server Error');
        });
});
    // Route PUT pour mettre à jour le prix d'une propriété et définir forSale à 1
app.put('/properties/update-price/:id/:price', async (req, res) => {
    try {
        const { id, price } = req.params;  // Récupérer l'ID et le prix depuis les paramètres d'URL

        // Valider l'ID fourni
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid property ID' });
        }

        // Rechercher la propriété par ID et mettre à jour le prix et forSale à 1
        const updatedProperty = await Property.findOneAndUpdate(
            { _id: id },  // Trouver la propriété par _id
            { price: price, forSale: 1 },  // Mettre à jour le prix et forSale à 1
            { new: true }  // Retourner le document mis à jour
        );

        // Vérifier si la propriété a été trouvée et mise à jour
        if (!updatedProperty) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // Retourner les détails de la propriété mise à jour
        res.status(200).json({ message: 'Property price updated successfully', updatedProperty });
    } catch (error) {
        console.error('Error updating property price:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Route GET pour récupérer les propriétés par propriétaire
app.get('/properties/:owner', (req, res) => {
    const owner = req.params.owner;

    Property.find({ owner: owner })
        .then(properties => {
            res.json(properties);
        })
        .catch(error => {
            res.status(500).send('Server Error');
        });
});

// Route GET pour récupérer les détails d'une propriété via son ID
app.get('/properties/owner/:id', async (req, res) => {
    try {
        const propertyId = req.params.id;
        console.log(`Fetching property with ID: ${propertyId}`);

        if (!mongoose.isValidObjectId(propertyId)) {
            return res.status(400).json({ message: 'Invalid property ID' });
        }

        const property = await Property.findOne({ _id: propertyId });

        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // Retrieve only the necessary fields
        const result = {
            idProperty: property.idProperty,
            description: property.description,
            price: property.price,
            owner: property.owner,
            forSale: property.forSale  // Retourner aussi l'état de vente
        };

        res.json(result);
    } catch (error) {
        console.error('Error fetching property from MongoDB:', error);
        res.status(500).json({ message: 'Error fetching property' });
    }
});

// Route DELETE pour supprimer une propriété
app.delete('/properties/supprimer/:id', async (req, res) => {
    try {
        const propertyId = req.params.id;

        // Validate the provided ID
        if (!mongoose.isValidObjectId(propertyId)) {
            return res.status(400).json({ message: 'Invalid property ID' });
        }

        // Find and delete the property by ID
        const deletedProperty = await Property.findByIdAndDelete(propertyId);

        // Check if the property was found and deleted
        if (!deletedProperty) {
            return res.status(404).json({ message: 'Property not found' });
        }

        res.status(200).json({ message: 'Property deleted successfully', deletedProperty });
    } catch (error) {
        console.error('Error deleting property:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Route PUT pour mettre à jour la propriété (y compris forSale à 0)
app.put('/properties/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { owner, price } = req.body;

        // Validate the provided ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({ message: 'Invalid property ID' });
        }

        // Find the property by ID and update owner, price, and set forSale to 0
        const updatedProperty = await Property.findOneAndUpdate(
            { _id: id },  // Trouver la propriété par _id
            { owner: owner, price: price, forSale: 0 },  // Mettre à jour l'owner, price et forSale à 0
            { new: true }  // Retourner le document mis à jour
        );

        // Si la propriété n'est pas trouvée
        if (!updatedProperty) {
            return res.status(404).json({ message: 'Property not found' });
        }

        // Retourner les détails de la propriété mise à jour
        res.json(updatedProperty);
    } catch (error) {
        console.error('Error updating property:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.listen(port, () => {
    console.log(`Serveur Express en écoute sur http://localhost:${port}`);
});
