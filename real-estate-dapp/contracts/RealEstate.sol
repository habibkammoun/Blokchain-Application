// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract RealEstate {
    struct Property {
        uint id;                  // Identifiant unique pour la propriété
        string description;       // Description de la propriété
        address payable owner;    // Propriétaire actuel
        uint price;               // Prix en wei
        address[] previousOwners; // Historique des anciens propriétaires
    }

    mapping(uint => Property) public properties;  // Mapping pour les propriétés
    uint public propertyCount;                    // Compteur pour les propriétés

    event PropertyListed(uint id, string description, address owner, uint price);
    event PropertySold(uint id, address newOwner, uint price);
    event OwnershipTransferred(uint id, address from, address to);

    // Garde de réentrance pour empêcher les attaques par réentrance
    bool internal locked;
    modifier noReentrancy() {
        require(!locked, "Reentrancy protection");
        locked = true;
        _;
        locked = false;
    }

    // Fonction pour ajouter une nouvelle propriété
    function addProperty(string memory _description, uint _price) public {
        require(_price > 0, "Price must be greater than zero"); // Le prix doit être supérieur à 0
        propertyCount++;
        address[] memory emptyOwners;  // Liste vide pour les anciens propriétaires

        properties[propertyCount] = Property({
            id: propertyCount,
            description: _description,
            owner: payable(msg.sender),
            price: _price,
            previousOwners: emptyOwners
        });

        emit PropertyListed(propertyCount, _description, msg.sender, _price);  // Événement de mise en vente
    }

    // Fonction pour acheter une propriété
    function buyProperty(uint _id) public payable noReentrancy {
        // Vérifier que la propriété existe
        require(propertyExists(_id), "Property does not exist");

        Property storage property = properties[_id];

        // Vérifier si la propriété est à vendre
        require(property.owner != address(0), "Property not for sale");

        // Vérifier que l'acheteur envoie le montant correct
        require(msg.value == property.price, "Incorrect price");

        // Vérifier que l'acheteur n'est pas le propriétaire actuel
        require(msg.sender != property.owner, "Cannot buy your own property");

        // Sauvegarder l'ancien propriétaire dans l'historique
        address payable previousOwner = property.owner;
        property.previousOwners.push(previousOwner); // Ajouter le précédent propriétaire à l'historique

        // Transférer la propriété au nouveau propriétaire
        property.owner = payable(msg.sender);

        // Transférer les fonds à l'ancien propriétaire
        previousOwner.transfer(msg.value);

        // Émettre des événements pour la vente et le transfert de propriété
        emit PropertySold(_id, msg.sender, property.price);
        emit OwnershipTransferred(_id, previousOwner, msg.sender);
    }

    // Fonction pour transférer manuellement la propriété
    function transferOwnership(uint _id, address payable _newOwner) public {
        // Vérifier que la propriété existe
        require(propertyExists(_id), "Property does not exist");

        Property storage property = properties[_id];

        // Vérifier que seul le propriétaire actuel peut transférer la propriété
        require(property.owner == msg.sender, "Only the owner can transfer ownership");

        // Vérifier que la nouvelle adresse de propriété n'est pas l'adresse zéro
        require(_newOwner != address(0), "New owner cannot be the zero address");

        // Sauvegarder l'ancien propriétaire dans l'historique
        address previousOwner = property.owner;
        property.previousOwners.push(previousOwner); // Ajouter le propriétaire actuel à l'historique

        // Transférer la propriété au nouveau propriétaire
        property.owner = _newOwner;

        // Émettre l'événement de transfert de propriété
        emit OwnershipTransferred(_id, previousOwner, _newOwner);
    }

    // Fonction pour obtenir les détails d'une propriété
    function getPropertyDetails(uint _id) public view returns (string memory description, address owner, uint price, address[] memory previousOwners) {
        // Vérifier que la propriété existe
        require(propertyExists(_id), "Property does not exist");

        Property storage property = properties[_id];

        // Retourner les détails de la propriété
        return (property.description, property.owner, property.price, property.previousOwners);
    }

    // Fonction pour vérifier si une propriété existe
    function propertyExists(uint _id) internal view returns (bool) {
        // Vérifier si la propriété existe dans le mapping
        return (_id > 0 && _id <= propertyCount && properties[_id].owner != address(0));
    }

    // Fonction pour obtenir l'historique des anciens propriétaires
    function getPreviousOwners(uint _id) public view returns (address[] memory) {
        // Vérifier que la propriété existe
        require(propertyExists(_id), "Property does not exist");

        // Retourner la liste des anciens propriétaires
        return properties[_id].previousOwners;
    }
}

