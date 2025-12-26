import { type RelationshipDto } from '@formmate/shared';

export class RelationshipModel {
    constructor(public readonly relationship: RelationshipDto) { }

    normalize(): RelationshipDto {
        return {
            ...this.relationship,
            label: this.relationship.label || this.relationship.fieldName
        };
    }
}

export const normalizeRelationship = (relationship: RelationshipDto) => {
    return new RelationshipModel(relationship).normalize();
};
