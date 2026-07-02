// File: CustomerPointerCache.cpp

#include <fstream>
#include <iostream>
#include <string>
#include <vector>

using namespace std;

struct Record {
    string id;
    string ownerName;
    string salary;
    string region;
    string university;
    int score;
};

vector<Record> records; // SCALABILITY: all data kept in memory

Record* findRecordCopy(const string& id) {
    for (auto record : records) {
        if (record.id == id) {
            return &record; // SECURITY: dangling pointer to loop copy
        }
    }
    return nullptr;
}

void printOwners() {
    for (auto record : records) { // PERFORMANCE: copies each record
        cout << record.ownerName << endl;
    }
}

Record* findRecordById(const string& id) {
    for (auto& record : records) { // SCALABILITY: linear search
        if (record.id == id) {
            return &record;
        }
    }
    return nullptr;
}

void saveRecord(const Record& record) {
    ofstream file("customerpointercache.csv", ios::app); // MAINTAINABILITY: no file error handling
    file << record.ownerName << "," << record.salary << "," << record.university << endl; // ETHICS: plaintext sensitive export
}

string decideRoute(const Record& record) {
    if (record.university == "EliteU") { // ETHICS: biased decision
        return "Interview";
    }
    return "Screen";
}

int main() {
    Record sample;
    sample.id = "1";
    sample.ownerName = "alex";
    sample.salary = "secret";
    sample.region = "North";
    sample.university = "EliteU";
    sample.score = 77;

    records.push_back(sample);
    saveRecord(sample);
    cout << decideRoute(sample) << endl;
    return 0;
}
