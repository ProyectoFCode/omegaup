<template>
  <div class="panel panel-default">
    <div class="panel-body">
      <div class="upload-csv">
        <div class="panel-heading">
          <omegaup-markdown :markdown="T.groupsCsvHelp"></omegaup-markdown>
          {{ T.groupsUploadCsvFile }}
          <input name="identities" type="file" @change="readCsv" />
        </div>
      </div>
      <br />
      <div
        v-show="identities.length > 0"
        class="panel panel-default no-bottom-margin"
      >
        <div class="panel-heading">
          <h3 class="panel-title">{{ T.wordsIdentities }}</h3>
        </div>
        <table class="identities-table table">
          <thead>
            <tr>
              <th>{{ T.profileUsername }}</th>
              <th>{{ T.profile }}</th>
              <th>{{ T.loginPassword }}</th>
              <th>{{ T.profileCountry }}</th>
              <th>{{ T.profileState }}</th>
              <th>{{ T.wordsGender }}</th>
              <th>{{ T.profileSchool }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="identity in identities"
              :key="identity.username"
              :class="{ 'alert-danger': userErrorRow === identity.username }"
            >
              <td class="username">
                <strong>{{ identity.username }}</strong>
              </td>
              <td>{{ identity.name }}</td>
              <td class="password">{{ identity.password }}</td>
              <td>{{ identity.country_id }}</td>
              <td>{{ identity.state_id }}</td>
              <td>{{ identity.gender }}</td>
              <td>{{ identity.school_name }}</td>
            </tr>
          </tbody>
        </table>
        <div class="panel-heading">
          <button
            class="btn btn-primary"
            name="create-identities"
            @click.prevent="$emit('bulk-identities', identities)"
          >
            {{ T.groupCreateIdentities }}
          </button>
        </div>
        <div class="panel-footer">
          <button
            class="btn"
            @click.prevent="$emit('download-identities', identities)"
          >
            <span
              class="glyphicon glyphicon-download-alt"
              aria-hidden="true"
            ></span>
          </button>
          {{ T.groupsIdentityWarning }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
import { types } from '../../api_types';
import T from '../../lang';
import * as ui from '../../ui';
import omegaup_Markdown from '../Markdown.vue';

@Component({
  components: {
    'omegaup-markdown': omegaup_Markdown,
  },
})
export default class Identities extends Vue {
  @Prop() groupAlias!: string;
  @Prop() userErrorRow!: string | null;

  T = T;
  identities: types.Identity[] = [];

  readCsv(ev: InputEvent): void {
    const fileUpload = <HTMLInputElement>ev.target;
    this.identities = [];
    if (fileUpload.value == '') {
      return;
    }
    const regex = /.*\.(?:csv|txt)$/;

    if (!regex.test(fileUpload.value.toLowerCase())) {
      ui.error(T.groupsInvalidCsv);
      return;
    }
    this.$emit('read-csv', this, fileUpload);
  }
}
</script>
