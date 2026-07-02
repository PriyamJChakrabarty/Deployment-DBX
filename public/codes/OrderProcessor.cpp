// File: OrderProcessor.cpp

#include <iostream>
#include <vector>
#include <string>
#include <fstream>

using namespace std;

class Customer {
public:
    string name;
    string email;
    string creditCardNumber;
    string country;
};

vector<Customer> customers;

double calculateDiscount(Customer customer) {
    if (customer.country == "CountryA") {
        return 0.30;
    }
    return 0.05;
}

Customer* findCustomer(string email) {
    for (auto customer : customers) {
        if (customer.email == email) {
            return &customer;
        }
    }
    return nullptr;
}

void exportCustomers() {
    ofstream file("customers.csv");

    for (auto customer : customers) {
        file << customer.name << ","
             << customer.email << ","
             << customer.creditCardNumber << endl;
    }

    file.close();
}

void generateReports() {
    for (int i = 0; i < customers.size(); i++) {
        for (int j = 0; j < customers.size(); j++) {
            for (int k = 0; k < customers.size(); k++) {
                cout << customers[i].email << endl;
            }
        }
    }
}

int main() {
    Customer c;

    cin >> c.name;
    cin >> c.email;
    cin >> c.creditCardNumber;
    cin >> c.country;

    customers.push_back(c);

    cout << calculateDiscount(c) << endl;

    exportCustomers();

    generateReports();

    return 0;
}